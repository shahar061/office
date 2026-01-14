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

// Agent View Rendering
function renderAgentView() {
    const container = elements.agentView;
    container.innerHTML = '';

    // Collect all agents
    const agents = [
        'backend-engineer',
        'frontend-engineer',
        'ui-ux-expert',
        'data-engineer',
        'automation-developer',
        'devops'
    ];

    // Group tasks by agent
    const tasksByAgent = {};
    agents.forEach(a => tasksByAgent[a] = { active: [], done: [] });

    state.features.forEach(feature => {
        feature.tasks.forEach(task => {
            const agent = task.agent;
            if (agent && tasksByAgent[agent]) {
                if (task.status === 'done' || task.status === 'completed') {
                    tasksByAgent[agent].done.push({ ...task, feature: feature.name });
                } else if (task.status !== 'queued') {
                    tasksByAgent[agent].active.push({ ...task, feature: feature.name });
                }
            }
        });
    });

    // Render columns
    agents.forEach(agent => {
        const data = tasksByAgent[agent];
        const column = document.createElement('div');
        column.className = 'agent-column';

        const displayName = agent.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());

        column.innerHTML = `
            <div class="agent-column-header">
                <div class="font-medium">${displayName}</div>
            </div>
            <div class="space-y-4">
                <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Active</div>
                    ${data.active.length > 0
                        ? data.active.map(t => renderTaskCard(t, true)).join('')
                        : '<div class="agent-idle">Idle</div>'
                    }
                </div>
                <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Done (${data.done.length})</div>
                    <div class="space-y-1">
                        ${data.done.slice(0, 5).map(t => renderTaskCardMini(t)).join('')}
                        ${data.done.length > 5 ? `<div class="text-xs text-gray-500 px-2">+${data.done.length - 5} more</div>` : ''}
                    </div>
                </div>
            </div>
        `;

        container.appendChild(column);
    });
}

function renderTaskCardMini(task) {
    return `
        <div class="task-card-mini">
            <div class="truncate">${escapeHtml(task.title)}</div>
            <div class="text-xs text-gray-500">${escapeHtml(task.feature)}</div>
        </div>
    `;
}

// Task Card Rendering
function renderTaskCard(task, showFeature = false) {
    const stuck = isTaskStuck(task);
    const stuckClass = stuck ? 'stuck' : '';
    const timeInState = formatTimeInState(task);

    // Retry badge
    let retryBadge = '';
    if (task.retry_count > 0) {
        const badgeClass = task.retry_count > 2 ? 'danger' : 'warning';
        retryBadge = `<span class="retry-badge ${badgeClass}">Retry: ${task.retry_count}</span>`;
    }

    // Review warning badge
    let reviewWarningBadge = '';
    if (task.review_status === 'has-warnings') {
        reviewWarningBadge = '<span class="review-warning-badge">CR Warnings</span>';
    }

    // Dependencies
    let depsHtml = '';
    if (task.depends_on && task.depends_on.length > 0) {
        const blockedBy = task.depends_on.filter(depId => {
            // Find if dependency is not done
            for (const f of state.features) {
                const depTask = f.tasks.find(t => t.id === depId);
                if (depTask && depTask.status !== 'done' && depTask.status !== 'completed') {
                    return true;
                }
            }
            return false;
        });

        if (blockedBy.length > 0) {
            depsHtml = `<div class="dep-link mt-2">Blocked by: ${blockedBy.join(', ')}</div>`;
        }
    }

    // Find tasks blocking this one
    const blocking = [];
    state.features.forEach(f => {
        f.tasks.forEach(t => {
            if (t.depends_on && t.depends_on.includes(task.id)) {
                if (t.status !== 'done' && t.status !== 'completed') {
                    blocking.push(t.id);
                }
            }
        });
    });

    if (blocking.length > 0) {
        depsHtml += `<div class="dep-link">Blocking: ${blocking.join(', ')}</div>`;
    }

    // Error message
    let errorHtml = '';
    if (task.error) {
        const errorId = `error-${task.id}`;
        errorHtml = `
            <button class="text-xs text-red-400 hover:text-red-300 mt-2" onclick="toggleError('${errorId}')">
                Show error
            </button>
            <div id="${errorId}" class="error-message">${escapeHtml(task.error)}</div>
        `;
    }

    // Feature tag (for agent view)
    const featureTag = showFeature && task.feature
        ? `<span class="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">${escapeHtml(task.feature)}</span>`
        : '';

    // Current step
    let stepInfo = '';
    if (task.current_step && task.status === 'in_progress') {
        stepInfo = `<div class="text-xs text-gray-500 mt-1">Step ${task.current_step}/5</div>`;
    }

    return `
        <div class="task-card status-${task.status || 'queued'} ${stuckClass}">
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                    ${featureTag}
                    <div class="font-medium text-sm mt-1">${escapeHtml(task.id)}</div>
                    <div class="text-sm text-gray-300 mt-0.5">${escapeHtml(task.title)}</div>
                </div>
                <div class="flex flex-col gap-1">
                    ${retryBadge}
                    ${reviewWarningBadge}
                </div>
            </div>

            <div class="flex items-center justify-between mt-3 text-xs text-gray-500">
                <div class="flex items-center gap-2">
                    ${task.agent ? `<span>Agent: ${task.agent}</span>` : ''}
                </div>
                ${timeInState ? `<span class="has-tooltip relative">
                    ${timeInState} in state
                    ${stuck ? '<span class="tooltip">Task may be stuck</span>' : ''}
                </span>` : ''}
            </div>

            ${stepInfo}
            ${depsHtml}
            ${errorHtml}
        </div>
    `;
}

function toggleError(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle('expanded');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
