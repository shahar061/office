/**
 * Office Dashboard - Real-time build progress visualization
 */

// State
let state = {
    features: [],
    buildState: null,
    tasks: null,
    activity: [],
    taskDurations: {},
    connected: false,
    currentView: 'phase', // 'phase', 'feature', or 'agent'
    expandedPhase: null,
    stuckThreshold: 30 * 60 * 1000, // 30 minutes in ms
    // Navigation state
    currentPage: 'dashboard', // 'dashboard' or 'plan'
    // Plan page state
    documents: [],
    currentDoc: null,
    docCache: {}, // Cache loaded documents
};

// WebSocket
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;

// DOM Elements
const elements = {
    // Dashboard view elements
    phaseView: document.getElementById('phase-view'),
    featureView: document.getElementById('feature-view'),
    agentView: document.getElementById('agent-view'),
    emptyState: document.getElementById('empty-state'),
    btnPhaseView: document.getElementById('btn-phase-view'),
    btnFeatureView: document.getElementById('btn-feature-view'),
    btnAgentView: document.getElementById('btn-agent-view'),
    phaseCards: document.getElementById('phase-cards'),
    expandedPhase: document.getElementById('expanded-phase'),
    activityFeed: document.getElementById('activity-feed'),
    buildInfo: document.getElementById('build-info'),
    buildSession: document.getElementById('build-session'),
    buildProgressBar: document.getElementById('build-progress-bar'),
    buildProgressPct: document.getElementById('build-progress-pct'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    progressText: document.getElementById('progress-text'),
    elapsedTime: document.getElementById('elapsed-time'),
    reconnectOverlay: document.getElementById('reconnect-overlay'),
    reconnectAttempt: document.getElementById('reconnect-attempt'),
    // Navigation elements
    mainNav: document.getElementById('main-nav'),
    dashboardView: document.getElementById('dashboard-view'),
    planView: document.getElementById('plan-view'),
    sidebarStatusIndicator: document.getElementById('sidebar-status-indicator'),
    sidebarStatusText: document.getElementById('sidebar-status-text'),
    // Plan view elements
    docTabs: document.getElementById('doc-tabs'),
    documentContent: document.getElementById('document-content'),
    planDocCount: document.getElementById('plan-doc-count'),
};

// Initialize
function init() {
    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    if (params.has('stuck_threshold')) {
        state.stuckThreshold = parseInt(params.get('stuck_threshold')) * 60 * 1000;
    }

    // Check for page param in URL
    if (params.has('page')) {
        state.currentPage = params.get('page');
    }

    // Set up view toggle
    elements.btnPhaseView.addEventListener('click', () => setView('phase'));
    elements.btnFeatureView.addEventListener('click', () => setView('feature'));
    elements.btnAgentView.addEventListener('click', () => setView('agent'));

    // Render sidebar navigation
    renderMainNav();

    // Load available documents for Plan page
    loadDocumentList();

    // Connect WebSocket
    connect();

    // Update elapsed time every second
    setInterval(updateElapsedTime, 1000);

    // Apply initial page view
    switchPage(state.currentPage);
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
    state.activity = data.activity || [];
    state.taskDurations = data.task_durations || {};

    render();
}

// View Management
function setView(view) {
    state.currentView = view;
    state.expandedPhase = null; // Reset expanded phase when changing views

    // Update toggle buttons
    elements.btnPhaseView.classList.toggle('active', view === 'phase');
    elements.btnFeatureView.classList.toggle('active', view === 'feature');
    elements.btnAgentView.classList.toggle('active', view === 'agent');

    // Show/hide views
    elements.phaseView.classList.toggle('hidden', view !== 'phase');
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
    if (task.status === 'done' || task.status === 'completed' || task.status === 'queued' || task.status === 'in_review') return false;

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
        elements.phaseView.classList.add('hidden');
        elements.featureView.classList.add('hidden');
        elements.agentView.classList.add('hidden');
        elements.buildInfo.classList.add('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');

    // Update build info bar
    updateBuildInfo();

    // Update progress
    updateProgress();

    // Render current view
    if (state.currentView === 'phase') {
        renderPhaseView();
    } else if (state.currentView === 'feature') {
        renderFeatureView();
    } else {
        renderAgentView();
    }
}

function updateBuildInfo() {
    if (!state.buildState?.build) {
        elements.buildInfo.classList.add('hidden');
        return;
    }

    elements.buildInfo.classList.remove('hidden');

    const sessionId = state.buildState.build.session_id || 'Unknown';
    elements.buildSession.textContent = `Build: ${sessionId}`;

    // Calculate progress
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
    elements.buildProgressBar.style.width = `${percent}%`;
    elements.buildProgressPct.textContent = `${percent}%`;
}

function renderPhaseView() {
    renderPhaseCards();
    renderExpandedPhase();
    renderActivityFeed();
}

function renderPhaseCards() {
    const container = elements.phaseCards;
    container.innerHTML = '';

    state.features.forEach((phase, index) => {
        // Add arrow between phases (except first)
        if (index > 0) {
            const arrow = document.createElement('span');
            arrow.className = 'phase-arrow';
            arrow.textContent = '→';
            container.appendChild(arrow);
        }

        // Count tasks
        const totalTasks = phase.tasks.length;
        const doneTasks = phase.tasks.filter(t =>
            t.status === 'done' || t.status === 'completed'
        ).length;

        // Determine status icon
        let statusIcon = '⏳'; // pending/blocked
        if (phase.status === 'in_progress') statusIcon = '🔄';
        else if (phase.status === 'completed') statusIcon = '✅';
        else if (phase.status === 'failed') statusIcon = '❌';

        const card = document.createElement('div');
        card.className = `phase-card status-${phase.status || 'pending'}`;
        if (state.expandedPhase === phase.id) {
            card.classList.add('expanded');
        }

        card.innerHTML = `
            <div class="phase-status-icon">${statusIcon}</div>
            <div class="text-sm font-medium mb-1">${escapeHtml(phase.name)}</div>
            <div class="text-xs text-gray-500">${phase.id}</div>
            <div class="text-xs text-gray-400 mt-2">${doneTasks}/${totalTasks} tasks</div>
        `;

        card.addEventListener('click', () => togglePhaseExpand(phase.id));
        container.appendChild(card);
    });
}

function togglePhaseExpand(phaseId) {
    if (state.expandedPhase === phaseId) {
        state.expandedPhase = null;
    } else {
        state.expandedPhase = phaseId;
    }
    render();
}

function renderExpandedPhase() {
    const container = elements.expandedPhase;

    if (!state.expandedPhase) {
        container.classList.add('hidden');
        return;
    }

    const phase = state.features.find(f => f.id === state.expandedPhase);
    if (!phase) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    // Count by status
    const doneTasks = phase.tasks.filter(t => t.status === 'done' || t.status === 'completed').length;

    container.innerHTML = `
        <div class="expanded-phase-panel">
            <div class="expanded-phase-header">
                <div>
                    <h3 class="text-lg font-medium">${escapeHtml(phase.name)}</h3>
                    <p class="text-sm text-gray-400">${phase.id} • ${doneTasks}/${phase.tasks.length} tasks complete</p>
                </div>
                <button onclick="togglePhaseExpand('${phase.id}')" class="text-gray-400 hover:text-white text-sm">
                    [Collapse]
                </button>
            </div>
            <div class="expanded-phase-tasks">
                ${phase.tasks.map(task => renderTaskMini(task)).join('')}
            </div>
        </div>
    `;
}

function renderTaskMini(task) {
    const duration = state.taskDurations[task.id];
    const durationStr = duration ? formatDuration(duration) : '';

    let statusIcon = '⏳';
    if (task.status === 'in_progress') statusIcon = '🔄';
    else if (task.status === 'done' || task.status === 'completed') statusIcon = '✅';
    else if (task.status === 'failed') statusIcon = '❌';

    return `
        <div class="task-mini status-${task.status || 'queued'}">
            <div class="text-lg mb-1">${statusIcon}</div>
            <div class="text-xs font-medium">${escapeHtml(task.id)}</div>
            <div class="text-xs text-gray-400 truncate" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</div>
            ${durationStr ? `<div class="text-xs text-gray-500 mt-1">${durationStr}</div>` : ''}
        </div>
    `;
}

function formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function renderActivityFeed() {
    const container = elements.activityFeed;

    if (!state.activity.length) {
        container.innerHTML = '<div class="text-sm text-gray-500 italic">No activity yet</div>';
        return;
    }

    container.innerHTML = state.activity.slice(0, 20).map(event => {
        const time = formatActivityTime(event.timestamp);
        const { text, type } = formatActivityEvent(event.event);

        return `
            <div class="activity-item ${type}">
                <span class="activity-time">${time}</span>
                <span class="activity-event">${escapeHtml(text)}</span>
                <span class="activity-phase">${event.phase}</span>
            </div>
        `;
    }).join('');
}

function formatActivityTime(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch {
        return '--:--';
    }
}

function formatActivityEvent(event) {
    if (event === 'PHASE_START') {
        return { text: 'Phase started', type: 'phase-start' };
    }
    if (event === 'PHASE_COMPLETE') {
        return { text: 'Phase completed', type: 'phase-complete' };
    }
    if (event.startsWith('TASK_START:')) {
        const taskId = event.split(':')[1];
        return { text: `Task ${taskId} started`, type: 'task-start' };
    }
    if (event.startsWith('TASK_DONE:')) {
        const taskId = event.split(':')[1];
        const duration = state.taskDurations[taskId];
        const durationStr = duration ? ` (${formatDuration(duration)})` : '';
        return { text: `Task ${taskId} done${durationStr}`, type: 'task-done' };
    }
    return { text: event, type: '' };
}

// Make togglePhaseExpand available globally for onclick
window.togglePhaseExpand = togglePhaseExpand;

// Feature View Rendering
function renderFeatureView() {
    const container = elements.featureView;
    container.innerHTML = '';

    const statuses = ['queued', 'assigned', 'in_progress', 'in_review', 'done', 'completed', 'failed'];

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
                ${renderStatusColumn('In Review', feature.tasks.filter(t => t.status === 'in_review'))}
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

// Status icon configuration
const statusConfig = {
    queued: { icon: '&#128337;', label: 'Queued' },      // Clock
    assigned: { icon: '&#128100;', label: 'Assigned' },  // Person
    in_progress: { icon: '&#9881;', label: 'In Progress' }, // Gear (spinning)
    in_review: { icon: '&#128269;', label: 'In Review' }, // Magnifying glass
    completed: { icon: '&#10004;', label: 'Completed' }, // Check mark
    done: { icon: '&#10004;', label: 'Done' },           // Check mark
    failed: { icon: '&#10060;', label: 'Failed' }        // X mark
};

// Time warning threshold (in seconds)
function getTimeClass(seconds) {
    if (seconds > 300) return 'time-danger';  // > 5 min
    if (seconds > 120) return 'time-warning'; // > 2 min
    return '';
}

// Task Card Rendering
function renderTaskCard(task, showFeature = false) {
    const stuck = isTaskStuck(task);
    const stuckClass = stuck ? 'stuck' : '';
    const timeInState = formatTimeInState(task);
    const status = task.status || 'queued';
    const config = statusConfig[status] || statusConfig.queued;

    // Status icon with pulse for in_progress
    const pulseHtml = status === 'in_progress' ? '<div class="status-pulse"></div>' : '';
    const spinnerClass = status === 'in_progress' ? 'status-spinner' : '';

    // Agent badge
    let agentBadge = '';
    if (task.agent) {
        const agentClass = `agent-${task.agent}`;
        const agentName = task.agent.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        agentBadge = `
            <span class="agent-badge ${agentClass}">
                <span class="agent-badge-dot"></span>
                ${escapeHtml(agentName)}
            </span>
        `;
    }

    // Retry badge
    let retryBadge = '';
    if (task.retry_count > 0) {
        const badgeClass = task.retry_count > 2 ? 'danger' : 'warning';
        retryBadge = `<span class="retry-badge ${badgeClass}">&#8635; ${task.retry_count}</span>`;
    }

    // Review warning badge
    let reviewWarningBadge = '';
    if (task.review_status === 'has-warnings') {
        reviewWarningBadge = '<span class="review-warning-badge">&#9888; Review</span>';
    }

    // Dependencies
    let depsHtml = '';
    if (task.depends_on && task.depends_on.length > 0) {
        const blockedBy = task.depends_on.filter(depId => {
            for (const f of state.features) {
                const depTask = f.tasks.find(t => t.id === depId);
                if (depTask && depTask.status !== 'done' && depTask.status !== 'completed') {
                    return true;
                }
            }
            return false;
        });

        if (blockedBy.length > 0) {
            depsHtml = `<div class="task-card-deps"><span class="dep-link">&#128279; Blocked by: <span class="dep-blocked">${blockedBy.join(', ')}</span></span></div>`;
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
        depsHtml += `<div class="task-card-deps"><span class="dep-link">&#8594; Blocking: <span class="dep-blocking">${blocking.join(', ')}</span></span></div>`;
    }

    // Error message
    let errorHtml = '';
    if (task.error) {
        errorHtml = `
            <details class="error-details">
                <summary class="error-summary">&#9888; View error details</summary>
                <div class="error-content">
                    <code>${escapeHtml(task.error)}</code>
                </div>
            </details>
        `;
    }

    // Feature tag (for agent view)
    const featureTag = showFeature && task.feature
        ? `<span class="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400 mb-1 inline-block">${escapeHtml(task.feature)}</span>`
        : '';

    // Current step
    let stepInfo = '';
    if (task.current_step && status === 'in_progress') {
        const progress = (task.current_step / 5) * 100;
        stepInfo = `
            <div class="mt-2">
                <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>Step ${task.current_step}/5</span>
                </div>
                <div class="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full bg-amber-500 transition-all" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }

    // Time in state with warning class
    let timeHtml = '';
    if (timeInState) {
        const timeClass = stuck ? 'time-danger' : '';
        timeHtml = `
            <span class="task-card-meta-item ${timeClass} has-tooltip relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12,6 12,12 16,14"></polyline>
                </svg>
                ${timeInState}
                ${stuck ? '<span class="tooltip">Task may be stuck</span>' : ''}
            </span>
        `;
    }

    return `
        <div class="task-card status-${status} ${stuckClass}">
            <!-- Header -->
            <div class="task-card-header">
                <div class="task-card-title-group">
                    <!-- Status Icon -->
                    <div class="status-icon-wrapper">
                        ${pulseHtml}
                        <div class="status-icon status-${status} ${spinnerClass}">
                            ${config.icon}
                        </div>
                    </div>
                    <!-- Title + ID -->
                    <div class="min-w-0 flex-1">
                        ${featureTag}
                        <div class="task-card-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</div>
                        <div class="task-card-id">${escapeHtml(task.id)}</div>
                    </div>
                </div>
                <!-- Right side: Agent + Badges -->
                <div class="flex flex-col items-end gap-1">
                    ${agentBadge}
                    <div class="flex gap-1">
                        ${retryBadge}
                        ${reviewWarningBadge}
                    </div>
                </div>
            </div>

            <!-- Meta Row -->
            <div class="task-card-meta">
                ${timeHtml}
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

// ============================================
// NAVIGATION
// ============================================

// SVG Icons for navigation
const navIcons = {
    dashboard: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
    </svg>`,
    plan: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>`
};

function renderMainNav() {
    const nav = elements.mainNav;
    if (!nav) return;

    const items = [
        { id: 'dashboard', label: 'Dashboard', icon: navIcons.dashboard },
        { id: 'plan', label: 'Plan', icon: navIcons.plan }
    ];

    nav.innerHTML = items.map(item => `
        <button
            onclick="switchPage('${item.id}')"
            class="nav-item w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                ${state.currentPage === item.id
                    ? 'bg-gray-700 text-white border-l-2 border-blue-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white border-l-2 border-transparent'}"
        >
            ${item.icon}
            <span>${item.label}</span>
        </button>
    `).join('');
}

function switchPage(pageId) {
    if (!elements.dashboardView || !elements.planView) return;

    // Update state
    state.currentPage = pageId;

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('page', pageId);
    window.history.replaceState({}, '', url);

    // Fade out current view
    const dashboardView = elements.dashboardView;
    const planView = elements.planView;

    if (pageId === 'dashboard') {
        planView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        dashboardView.style.opacity = '0';
        requestAnimationFrame(() => {
            dashboardView.style.opacity = '1';
        });
    } else if (pageId === 'plan') {
        dashboardView.classList.add('hidden');
        planView.classList.remove('hidden');
        planView.style.opacity = '0';
        requestAnimationFrame(() => {
            planView.style.opacity = '1';
        });

        // Load first document if none selected
        if (!state.currentDoc && state.documents.length > 0) {
            loadDocument(state.documents[0].id);
        }
    }

    // Update nav highlight
    renderMainNav();
}

// Make switchPage available globally
window.switchPage = switchPage;

// ============================================
// PLAN PAGE - DOCUMENT HANDLING
// ============================================

async function loadDocumentList() {
    try {
        const response = await fetch('/api/documents');
        const data = await response.json();

        if (data.documents) {
            state.documents = data.documents;
            renderDocTabs();

            // Update document count
            if (elements.planDocCount) {
                elements.planDocCount.textContent = data.documents.length;
            }
        }
    } catch (error) {
        console.error('Failed to load document list:', error);
    }
}

function renderDocTabs() {
    const tabs = elements.docTabs;
    if (!tabs) return;

    tabs.innerHTML = state.documents.map(doc => `
        <button
            onclick="loadDocument('${doc.id}')"
            class="doc-tab px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
                ${state.currentDoc === doc.id
                    ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-900/50'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 border-b-2 border-transparent'}"
        >
            ${escapeHtml(doc.label)}
        </button>
    `).join('');
}

async function loadDocument(docId) {
    state.currentDoc = docId;
    renderDocTabs();

    const contentEl = elements.documentContent;
    if (!contentEl) return;

    // Show loading state
    contentEl.innerHTML = `
        <div class="flex items-center justify-center py-20 text-gray-500">
            <div class="text-center">
                <svg class="w-12 h-12 mx-auto mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <p>Loading document...</p>
            </div>
        </div>
    `;

    // Check cache first
    if (state.docCache[docId]) {
        renderMarkdown(state.docCache[docId]);
        return;
    }

    try {
        const response = await fetch(`/api/documents/${docId}`);
        const data = await response.json();

        if (data.error) {
            contentEl.innerHTML = `
                <div class="flex items-center justify-center py-20 text-red-400">
                    <div class="text-center">
                        <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <p>Failed to load document</p>
                        <p class="text-sm text-gray-500 mt-2">${escapeHtml(data.error)}</p>
                        <button onclick="loadDocument('${docId}')" class="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                            Try again
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Cache the content
        state.docCache[docId] = data.content;

        // Render markdown
        renderMarkdown(data.content);

    } catch (error) {
        console.error('Failed to load document:', error);
        contentEl.innerHTML = `
            <div class="flex items-center justify-center py-20 text-red-400">
                <div class="text-center">
                    <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <p>Failed to load document</p>
                    <button onclick="loadDocument('${docId}')" class="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                        Try again
                    </button>
                </div>
            </div>
        `;
    }
}

function renderMarkdown(content) {
    const contentEl = elements.documentContent;
    if (!contentEl) return;

    // Check if marked library is available
    if (typeof marked === 'undefined') {
        contentEl.innerHTML = `<pre class="whitespace-pre-wrap text-gray-300">${escapeHtml(content)}</pre>`;
        return;
    }

    // Configure marked options
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true,
    });

    // Render markdown to HTML
    const html = marked.parse(content);
    contentEl.innerHTML = html;

    // Scroll to top
    contentEl.scrollTop = 0;
}

// Make loadDocument available globally
window.loadDocument = loadDocument;

// Start the app
document.addEventListener('DOMContentLoaded', init);
