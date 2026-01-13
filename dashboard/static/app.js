/**
 * Office Dashboard - Real-time build progress visualization
 */

// State
let state = {
    features: [],
    buildState: null,
    tasks: null,
    connected: false,
    currentView: 'feature', // 'feature' or 'agent'
    stuckThreshold: 30 * 60 * 1000, // 30 minutes in ms
};

// WebSocket
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;

// DOM Elements
const elements = {
    featureView: document.getElementById('feature-view'),
    agentView: document.getElementById('agent-view'),
    emptyState: document.getElementById('empty-state'),
    btnFeatureView: document.getElementById('btn-feature-view'),
    btnAgentView: document.getElementById('btn-agent-view'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    progressText: document.getElementById('progress-text'),
    elapsedTime: document.getElementById('elapsed-time'),
    reconnectOverlay: document.getElementById('reconnect-overlay'),
    reconnectAttempt: document.getElementById('reconnect-attempt'),
};

// Initialize
function init() {
    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    if (params.has('stuck_threshold')) {
        state.stuckThreshold = parseInt(params.get('stuck_threshold')) * 60 * 1000;
    }

    // Set up view toggle
    elements.btnFeatureView.addEventListener('click', () => setView('feature'));
    elements.btnAgentView.addEventListener('click', () => setView('agent'));

    // Connect WebSocket
    connect();

    // Update elapsed time every second
    setInterval(updateElapsedTime, 1000);
}

// WebSocket Connection
function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            state.connected = true;
            reconnectAttempts = 0;
            updateConnectionStatus('connected');
            hideReconnectOverlay();
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleMessage(message);
            } catch (e) {
                console.error('Failed to parse message:', e);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            state.connected = false;
            updateConnectionStatus('disconnected');
            scheduleReconnect();
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        // Keepalive ping
        setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send('ping');
            }
        }, 25000);

    } catch (e) {
        console.error('Failed to connect:', e);
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        updateConnectionStatus('failed');
        return;
    }

    reconnectAttempts++;
    const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts - 1);

    showReconnectOverlay();
    elements.reconnectAttempt.textContent = `Attempt ${reconnectAttempts} of ${MAX_RECONNECT_ATTEMPTS}`;

    setTimeout(connect, delay);
}

function handleMessage(message) {
    switch (message.type) {
        case 'initial_state':
        case 'state_update':
            updateState(message.data);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

function updateState(data) {
    state.features = data.merged || [];
    state.buildState = data.build_state;
    state.tasks = data.tasks;

    render();
}

// View Management
function setView(view) {
    state.currentView = view;

    // Update toggle buttons
    elements.btnFeatureView.classList.toggle('active', view === 'feature');
    elements.btnAgentView.classList.toggle('active', view === 'agent');

    // Show/hide views
    elements.featureView.classList.toggle('hidden', view !== 'feature');
    elements.agentView.classList.toggle('hidden', view !== 'agent');

    render();
}

// Connection Status
function updateConnectionStatus(status) {
    const indicator = elements.statusIndicator;
    const text = elements.statusText;

    switch (status) {
        case 'connected':
            indicator.className = 'w-2 h-2 rounded-full bg-green-500';
            text.textContent = 'Connected';
            break;
        case 'disconnected':
            indicator.className = 'w-2 h-2 rounded-full bg-yellow-500';
            text.textContent = 'Reconnecting...';
            break;
        case 'failed':
            indicator.className = 'w-2 h-2 rounded-full bg-red-500';
            text.textContent = 'Disconnected';
            break;
    }
}

function showReconnectOverlay() {
    elements.reconnectOverlay.classList.remove('hidden');
}

function hideReconnectOverlay() {
    elements.reconnectOverlay.classList.add('hidden');
}

// Progress and Time
function updateProgress() {
    if (!state.features.length) {
        elements.progressText.textContent = 'No tasks';
        return;
    }

    let total = 0;
    let completed = 0;

    state.features.forEach(feature => {
        feature.tasks.forEach(task => {
            total++;
            if (task.status === 'done' || task.status === 'completed') {
                completed++;
            }
        });
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    elements.progressText.textContent = `${completed}/${total} tasks (${percent}%)`;
}

function updateElapsedTime() {
    if (!state.buildState?.build?.started_at) {
        elements.elapsedTime.textContent = '';
        return;
    }

    const started = new Date(state.buildState.build.started_at);
    const now = new Date();
    const elapsed = now - started;

    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    let timeStr = '';
    if (hours > 0) timeStr += `${hours}h `;
    if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
    timeStr += `${seconds}s`;

    elements.elapsedTime.textContent = timeStr;
}

// Utility
function isTaskStuck(task) {
    if (!task.status_changed_at) return false;
    if (task.status === 'done' || task.status === 'completed' || task.status === 'queued') return false;

    const changed = new Date(task.status_changed_at);
    const now = new Date();
    return (now - changed) > state.stuckThreshold;
}

function formatTimeInState(task) {
    if (!task.status_changed_at) return '';

    const changed = new Date(task.status_changed_at);
    const now = new Date();
    const elapsed = now - changed;

    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

// Main Render
function render() {
    // Check for empty state
    if (!state.features.length) {
        elements.emptyState.classList.remove('hidden');
        elements.featureView.classList.add('hidden');
        elements.agentView.classList.add('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');

    // Update progress
    updateProgress();

    // Render current view
    if (state.currentView === 'feature') {
        renderFeatureView();
    } else {
        renderAgentView();
    }
}

// Feature View Rendering
function renderFeatureView() {
    const container = elements.featureView;
    container.innerHTML = '';

    const statuses = ['queued', 'assigned', 'in_progress', 'review', 'done', 'completed', 'failed'];

    state.features.forEach(feature => {
        const lane = document.createElement('div');
        lane.className = 'feature-lane';

        // Count tasks by status
        const taskCounts = {};
        statuses.forEach(s => taskCounts[s] = 0);
        feature.tasks.forEach(t => {
            const status = t.status || 'queued';
            taskCounts[status] = (taskCounts[status] || 0) + 1;
        });

        const doneCount = (taskCounts.done || 0) + (taskCounts.completed || 0);
        const totalCount = feature.tasks.length;

        // Header
        lane.innerHTML = `
            <div class="feature-lane-header">
                <div class="flex items-center gap-3">
                    <span class="text-sm font-medium">${escapeHtml(feature.name)}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">${feature.id}</span>
                    ${feature.status === 'in_progress' ? '<span class="text-xs text-yellow-400">In Progress</span>' : ''}
                    ${feature.status === 'completed' ? '<span class="text-xs text-green-400">Completed</span>' : ''}
                </div>
                <span class="text-sm text-gray-500">${doneCount}/${totalCount} done</span>
            </div>
            <div class="grid grid-cols-5 gap-4">
                ${renderStatusColumn('Queued', feature.tasks.filter(t => t.status === 'queued' || !t.status))}
                ${renderStatusColumn('Active', feature.tasks.filter(t => t.status === 'assigned' || t.status === 'in_progress'))}
                ${renderStatusColumn('Review', feature.tasks.filter(t => t.status === 'review'))}
                ${renderStatusColumn('Done', feature.tasks.filter(t => t.status === 'done' || t.status === 'completed'))}
                ${renderStatusColumn('Failed', feature.tasks.filter(t => t.status === 'failed'))}
            </div>
        `;

        container.appendChild(lane);
    });
}

function renderStatusColumn(title, tasks) {
    const tasksHtml = tasks.length > 0
        ? tasks.map(t => renderTaskCard(t)).join('')
        : '<div class="text-xs text-gray-600 italic px-2">No tasks</div>';

    return `
        <div class="status-column">
            <div class="status-column-header">${title} (${tasks.length})</div>
            <div class="space-y-2">
                ${tasksHtml}
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
