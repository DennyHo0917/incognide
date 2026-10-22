import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    MessageSquare, Terminal, Globe, FileText, File as FileIcon,
    BrainCircuit, Bot, Zap, Users, Database, ChevronDown,
    GitBranch, Image, Columns, Layers,
    Server, Sun, Moon, X, Download, FolderOpen, ExternalLink, LayoutGrid, RefreshCw
} from 'lucide-react';
import npcLogo from '../../assets/icon.png';
import { useAiEnabled } from './AiFeatureContext';
import { SshConnection } from '../hooks/useRemoteConnections';
import TerminalCreateButton from './TerminalCreateButton';

interface PaneItem {
    id: string;
    type: string;
    title: string;
    isActive: boolean;
}

interface StatusBarProps {
    paneItems: PaneItem[];
    setActiveContentPaneId: (id: string) => void;
    height?: number;
    onStartResize?: () => void;
    sidebarCollapsed?: boolean;
    onExpandSidebar?: () => void;
    sidebarWidth?: number;
    topBarCollapsed?: boolean;
    onExpandTopBar?: () => void;
    onCollapse?: () => void;
    openMode?: 'pane' | 'tab';
    onToggleOpenMode?: () => void;
    activeConnection?: { host: string } | null;
    sshConnections?: SshConnection[];
    onConnectSsh?: (config: Omit<SshConnection, 'isConnected' | 'currentPath'>) => Promise<{ success: boolean; error?: string }>;
    onDisconnectSsh?: (id: string) => Promise<void>;
    onOpenSSHDialog?: () => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    searchScope: string;
    setSearchScope: (scope: string) => void;
    searchInputRef?: React.RefObject<HTMLInputElement>;
    createSearchPane?: (query?: string, scope?: string) => void;
    deepSearchResults: any[];
    messageSearchResults: any[];
    setSearchResultsModalOpen: (open: boolean) => void;
    SEARCH_SCOPES: Record<string, string>;
    isDarkMode?: boolean;
    toggleTheme?: () => void;
    onOpenNewWindow?: () => void;
    createNewTerminal?: (shellType: string) => void;
    createNewConversation?: (opts?: { contentType?: 'chat' | 'agent'; npc?: string; model?: string }) => void;
    createNewBrowser?: (url?: string) => void;
    activeDownloads?: Record<string, any>;
    onOpenDownloadedFile?: (path: string) => void;
    onDismissDownload?: (filename: string) => void;
    pomodoroActive?: boolean;
    pomodoroPhase?: 'work' | 'break';
    pomodoroSecondsLeft?: number;
    onTogglePomodoro?: () => void;
    onOpenPomodoroConfig?: () => void;
    pomodoroConfigOpen?: boolean;
    pomodoroWorkMins?: number;
    pomodoroBreakMins?: number;
    onPomodoroWorkChange?: (mins: number) => void;
    onPomodoroBreakChange?: (mins: number) => void;
    pomodoroSchedule?: Array<{ days: number[]; startHour: number; startMinute: number }>;
    onPomodoroScheduleChange?: (schedule: Array<{ days: number[]; startHour: number; startMinute: number }>) => void;
}

const tomatoIcon = (active: boolean, phase: 'work' | 'break') => (
    <svg width="16" height="16" viewBox="0 0 24 24">
        <ellipse cx="12" cy="14" rx="9" ry="8" fill={active ? (phase === 'work' ? '#ef4444' : '#22c55e') : '#9ca3af'} />
        <ellipse cx="9" cy="12" rx="3" ry="2.5" fill="rgba(255,255,255,0.2)" />
        <path d="M12 6 Q12 3 10 2" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M12 5 Q15 3 17 4 Q15 5.5 12 5" fill="#22c55e" />
    </svg>
);

const formatPomodoroTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const StatusBar: React.FC<StatusBarProps> = ({
    paneItems,
    setActiveContentPaneId,
    height = 48,
    onStartResize,
    sidebarCollapsed = false,
    onExpandSidebar,
    sidebarWidth,
    onCollapse,
    openMode = 'pane',
    onToggleOpenMode,
    activeConnection,
    sshConnections,
    onConnectSsh,
    onDisconnectSsh,
    onOpenSSHDialog,
    searchTerm,
    setSearchTerm,
    searchScope,
    setSearchScope,
    searchInputRef,
    createSearchPane,
    deepSearchResults,
    messageSearchResults,
    setSearchResultsModalOpen,
    SEARCH_SCOPES,
    isDarkMode,
    toggleTheme,
    onOpenNewWindow,
    createNewTerminal,
    createNewConversation,
    createNewBrowser,
    activeDownloads = {},
    onOpenDownloadedFile,
    onDismissDownload,
    pomodoroActive = false,
    pomodoroPhase = 'work',
    pomodoroSecondsLeft = 25 * 60,
    onTogglePomodoro,
    onOpenPomodoroConfig,
    pomodoroConfigOpen = false,
    pomodoroWorkMins = 25,
    pomodoroBreakMins = 5,
    onPomodoroWorkChange,
    onPomodoroBreakChange,
    pomodoroSchedule = [],
    onPomodoroScheduleChange,
}) => {
    const buttonGroupWidth = sidebarCollapsed ? 192 : (sidebarWidth || 192);
    const aiEnabled = useAiEnabled();
    const [downloadPopoverOpen, setDownloadPopoverOpen] = useState(false);
    const [sshMenuOpen, setSshMenuOpen] = useState(false);
    const [passwordPromptId, setPasswordPromptId] = useState<string | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [updateState, setUpdateState] = useState<{ checking: boolean; latest: string | null; current: string | null; error: string | null }>({ checking: false, latest: null, current: null, error: null });

    useEffect(() => {
        (window as any).api?.getAppVersion?.().then((v: string) => setUpdateState(s => ({ ...s, current: v || null })));
    }, []);

    const checkUpdates = async () => {
        setUpdateState(s => ({ ...s, checking: true, error: null }));
        try {
            const result = await (window as any).api?.checkForUpdates?.();
            setUpdateState(s => ({ ...s, checking: false, latest: result?.latestVersion || null, error: result?.error || null }));
        } catch (err) {
            setUpdateState(s => ({ ...s, checking: false, error: String(err) }));
        }
    };

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const btnClass = "w-9 h-9 flex items-center justify-center rounded transition-colors hover:opacity-80 bg-transparent";

    return (
        <div className="flex-shrink-0 relative" style={{ height }}>
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500/50 transition-colors z-10"
                onMouseDown={(e) => { e.preventDefault(); onStartResize?.(); }}
            />
            <div className="h-full theme-bg-tertiary border-t theme-border flex items-center px-3 text-[12px] theme-text-muted gap-3">
            <div className="grid grid-cols-3 h-full -ml-3" style={{ width: buttonGroupWidth }}>
                {toggleTheme && (
                    <button
                        data-tutorial="theme-toggle-button"
                        onClick={toggleTheme}
                        className="flex items-center justify-center h-full hover:bg-teal-500/20 transition-all bg-transparent"
                        title="Toggle Theme"
                    >
                        {isDarkMode ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-yellow-400" />}
                    </button>
                )}
                <button
                    data-tutorial="manager-button"
                    onClick={() => (window as any).api?.openManagerWindow?.()}
                    className="flex items-center justify-center h-full hover:bg-teal-500/20 transition-all bg-transparent text-gray-400 hover:text-blue-400"
                    title="Open Manager"
                >
                    <LayoutGrid size={18} />
                </button>
                {onOpenNewWindow && (
                    <div className="relative h-full">
                        <button
                            data-tutorial="new-window-button"
                            onClick={onOpenNewWindow}
                            onContextMenu={(e) => { e.preventDefault(); setSshMenuOpen(o => !o); }}
                            className="w-full h-full flex items-center justify-center hover:bg-teal-500/20 transition-all bg-transparent"
                            title="New Window (Cmd/Ctrl+Shift+N) · right-click for SSH"
                        >
                            <img src={npcLogo} alt="Incognide" style={{ width: 18, height: 18 }} className="rounded-full" />
                        </button>
                        {sshMenuOpen && onOpenSSHDialog && (
                            <>
                                <div className="fixed inset-0 z-40 bg-transparent" onMouseDown={() => setSshMenuOpen(false)} />
                                <div className="absolute top-full left-0 mt-1 theme-bg-secondary border theme-border rounded shadow-xl z-50 py-1 min-w-[220px]">
                                    {sshConnections?.length === 0 && (
                                        <div className="px-3 py-1.5 text-[11px] text-gray-500">No saved connections</div>
                                    )}
                                    {sshConnections?.map((conn) => (
                                        <div key={conn.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5">
                                            <span className="text-xs theme-text-primary truncate max-w-[120px]">{conn.username}@{conn.host}</span>
                                            {conn.isConnected ? (
                                                <button
                                                    onClick={() => { onDisconnectSsh?.(conn.id); setSshMenuOpen(false); }}
                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                >
                                                    Disconnect
                                                </button>
                                            ) : (
                                                <>
                                                    {passwordPromptId === conn.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="password"
                                                                value={passwordInput}
                                                                onChange={(e) => setPasswordInput(e.target.value)}
                                                                placeholder="password"
                                                                className="w-24 px-1.5 py-0.5 rounded bg-[#0f0f14] border border-[#313244] text-[10px] text-[#cdd6f4] outline-none"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        onConnectSsh?.({ ...conn, password: passwordInput });
                                                                        setPasswordPromptId(null);
                                                                        setPasswordInput('');
                                                                        setSshMenuOpen(false);
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    onConnectSsh?.({ ...conn, password: passwordInput });
                                                                    setPasswordPromptId(null);
                                                                    setPasswordInput('');
                                                                    setSshMenuOpen(false);
                                                                }}
                                                                className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                                            >
                                                                Go
                                                            </button>
                                                            <button
                                                                onClick={() => { setPasswordPromptId(null); setPasswordInput(''); }}
                                                                className="text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:text-white"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                if (!conn.password && !conn.privateKeyPath) {
                                                                    setPasswordPromptId(conn.id);
                                                                } else {
                                                                    onConnectSsh?.(conn);
                                                                    setSshMenuOpen(false);
                                                                }
                                                            }}
                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                                        >
                                                            Connect
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    <div className="border-t theme-border my-1" />
                                    <button
                                        onClick={() => { onOpenSSHDialog(); setSshMenuOpen(false); }}
                                        className="flex items-center gap-2 px-3 py-1.5 w-full text-left text-xs theme-text-muted hover:bg-white/10"
                                    >
                                        <Server size={12} /> New SSH connection
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1" />

            {createNewTerminal && (
                <TerminalCreateButton createNewTerminal={createNewTerminal} createNewConversation={createNewConversation} createNewBrowser={createNewBrowser} />
            )}
            {onCollapse && (
                <button onClick={onCollapse} className={`${btnClass} text-gray-400 dark:text-gray-500`} title="Hide status bar"><ChevronDown size={18} /></button>
            )}
            <div data-tutorial="pane-indicators" className="flex items-center gap-1">
                {paneItems.map((pane) => (
                    <button key={pane.id} onClick={() => setActiveContentPaneId(pane.id)} className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${pane.isActive ? 'bg-blue-600 text-white' : 'bg-transparent theme-text-muted hover:opacity-80'}`} title={pane.title}>
                        {pane.type === 'chat' && <MessageSquare size={20} />}
                        {pane.type === 'agent' && <Bot size={20} />}
                        {pane.type === 'editor' && <FileIcon size={20} />}
                        {pane.type === 'terminal' && <Terminal size={20} />}
                        {pane.type === 'browser' && <Globe size={20} />}
                        {pane.type === 'pdf' && <FileText size={20} />}
                        {pane.type === 'graph-viewer' && <GitBranch size={20} />}
                        {pane.type === 'dbtool' && <Database size={20} />}
                        {pane.type === 'memory-manager' && <BrainCircuit size={20} />}
                        {pane.type === 'photoviewer' && <Image size={20} />}
                        {pane.type === 'npcteam' && <Bot size={20} />}
                        {pane.type === 'jinx' && <Zap size={20} />}
                        {pane.type === 'teammanagement' && <Users size={20} />}
                        {pane.type === 'diff' && <GitBranch size={20} />}
                        {pane.type === 'browsergraph' && <Globe size={20} />}
                        {!['chat', 'agent', 'editor', 'terminal', 'browser', 'pdf', 'graph-viewer', 'dbtool', 'memory-manager', 'photoviewer', 'npcteam', 'jinx', 'teammanagement', 'diff', 'browsergraph'].includes(pane.type) && <FileIcon size={20} />}
                    </button>
                ))}
            </div>

            <div className="flex-1" />

            <div className="grid grid-cols-3 h-full" style={{ width: buttonGroupWidth }}>
                <button
                    onClick={checkUpdates}
                    disabled={updateState.checking}
                    className="flex items-center justify-center h-full hover:bg-teal-500/20 transition-all bg-transparent text-gray-400 hover:text-blue-400 disabled:opacity-50"
                    title={updateState.latest ? `Latest: ${updateState.latest}` : updateState.error ? updateState.error : 'Check for updates'}
                >
                    <RefreshCw size={16} className={updateState.checking ? 'animate-spin' : ''} />
                </button>
                {onToggleOpenMode && (
                    <button data-tutorial="pane-tab-toggle" onClick={onToggleOpenMode} className={`flex items-center justify-center h-full hover:bg-teal-500/20 transition-all bg-transparent ${openMode === 'tab' ? 'text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} title={openMode === 'pane' ? 'Pane mode' : 'Tab mode'}>
                        {openMode === 'pane' ? <Columns size={18} /> : <Layers size={18} />}
                    </button>
                )}
                <button
                    onClick={onTogglePomodoro}
                    onContextMenu={(e) => { e.preventDefault(); onOpenPomodoroConfig?.(); }}
                    className={`flex items-center justify-center h-full hover:bg-teal-500/20 transition-all bg-transparent ${pomodoroActive ? (pomodoroPhase === 'work' ? 'text-red-400' : 'text-green-400') : 'text-gray-400 hover:text-blue-400'}`}
                    title={pomodoroActive ? `${pomodoroPhase === 'work' ? 'Working' : 'Break'} — ${formatPomodoroTime(pomodoroSecondsLeft)} left (click to stop, right-click to configure)` : 'Pomodoro Timer (right-click to configure)'}
                >
                    {pomodoroActive ? (
                        <span className="flex flex-col items-center leading-none">
                            {tomatoIcon(true, pomodoroPhase)}
                            <span className="font-mono tabular-nums text-[9px]">{formatPomodoroTime(pomodoroSecondsLeft)}</span>
                        </span>
                    ) : tomatoIcon(false, pomodoroPhase)}
                </button>
            </div>

            {Object.keys(activeDownloads).length > 0 && (
                <div className="relative">
                    {downloadPopoverOpen && (
                        <div className="fixed inset-0 z-40 bg-transparent" onMouseDown={() => setDownloadPopoverOpen(false)} />
                    )}
                    <button
                        onClick={() => setDownloadPopoverOpen(v => !v)}
                        className={`${btnClass} ${downloadPopoverOpen ? 'text-blue-300 bg-white/10' : 'text-blue-400'}`}
                    >
                        <Download size={18} />
                    </button>
                    {downloadPopoverOpen && (
                        <div className="absolute bottom-full right-0 mb-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 p-2">
                        {Object.entries(activeDownloads).map(([filename, dl]: [string, any]) => {
                            const ext = filename.split('.').pop()?.toLowerCase();
                            const openableInApp = onOpenDownloadedFile && ['pdf', 'csv', 'xlsx', 'xls', 'pptx', 'tex', 'ipynb', 'exp', 'pltx', 'docx', 'doc', 'odt', 'odp', 'ods', 'zip', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'm4v', 'flv', 'ogv', 'stl', 'db', 'sqlite', 'sqlite3'].includes(ext || '');
                            return (
                                <div key={filename} className="mb-2 last:mb-0">
                                    <div className="flex items-center justify-between text-[10px] text-gray-300 mb-0.5">
                                        <span className="truncate max-w-[120px]" title={filename}>{filename}</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] text-gray-500">
                                                {dl.state === 'completed' ? 'Done' : dl.state === 'interrupted' ? 'Failed' : dl.state === 'cancelled' ? 'Cancelled' : `${dl.progress ?? 0}%`}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDismissDownload?.(filename); }}
                                                className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300"
                                                title="Dismiss"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    </div>
                                    {dl.state !== 'completed' && dl.state !== 'interrupted' && dl.state !== 'cancelled' && (
                                        <div className="h-1 bg-gray-700 rounded overflow-hidden mb-1">
                                            <div className="h-full bg-blue-500 transition-all" style={{ width: `${dl.progress ?? 0}%` }} />
                                        </div>
                                    )}
                                    {dl.state === 'completed' && dl.path && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); (window as any).api?.showItemInFolder?.(dl.path); }}
                                                className="p-1 rounded hover:bg-white/10 text-gray-400"
                                                title="Show in folder"
                                            >
                                                <FolderOpen size={12} />
                                            </button>
                                            {openableInApp && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onOpenDownloadedFile?.(dl.path); }}
                                                    className="p-1 rounded hover:bg-white/10 text-gray-400"
                                                    title="Open in Incognide"
                                                >
                                                    <FileText size={12} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); (window as any).api?.openFile?.(dl.path); }}
                                                className="p-1 rounded hover:bg-white/10 text-gray-400"
                                                title="Open with default app"
                                            >
                                                <ExternalLink size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        </div>
                    )}
                </div>
            )}

            <div className="relative">
                {pomodoroConfigOpen && (
                    <>
                        <div className="fixed inset-0 z-40 bg-transparent" onMouseDown={() => onOpenPomodoroConfig?.()} />
                        <div className="absolute bottom-full right-0 mb-1 theme-bg-secondary border theme-border rounded shadow-xl z-50 p-3 min-w-[260px]">
                            <div className="text-xs font-medium theme-text-primary mb-2">Pomodoro Settings</div>
                            <label className="flex items-center justify-between text-xs theme-text-muted mb-1.5">
                                <span>Work (min)</span>
                                <input type="number" min="1" max="120" value={pomodoroWorkMins} onChange={e => onPomodoroWorkChange?.(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 px-1 py-0.5 rounded theme-bg-primary theme-border border text-xs text-right theme-text-primary" />
                            </label>
                            <label className="flex items-center justify-between text-xs theme-text-muted mb-2">
                                <span>Break (min)</span>
                                <input type="number" min="1" max="60" value={pomodoroBreakMins} onChange={e => onPomodoroBreakChange?.(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 px-1 py-0.5 rounded theme-bg-primary theme-border border text-xs text-right theme-text-primary" />
                            </label>
                            <div className="border-t theme-border pt-2 mt-1">
                                <div className="text-xs font-medium theme-text-primary mb-1.5">Schedule</div>
                                {pomodoroSchedule.map((entry, idx) => (
                                    <div key={idx} className="flex items-center gap-1 mb-1 text-[10px] theme-text-muted">
                                        <span className="flex-1">
                                            {['Su','Mo','Tu','We','Th','Fr','Sa'].filter((_, i) => entry.days.includes(i)).join(',')}
                                            {' '}at {String(entry.startHour).padStart(2,'0')}:{String(entry.startMinute).padStart(2,'0')}
                                        </span>
                                        <button onClick={() => onPomodoroScheduleChange?.(pomodoroSchedule.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-0.5"><X size={10} /></button>
                                    </div>
                                ))}
                                <div className="flex items-center gap-1 mt-1">
                                    <select
                                        id="pomo-sched-days"
                                        multiple
                                        className="w-20 text-[10px] theme-bg-primary theme-border border rounded p-0.5 theme-text-primary"
                                        style={{ height: '52px' }}
                                    >
                                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                                            <option key={i} value={i}>{d}</option>
                                        ))}
                                    </select>
                                    <input id="pomo-sched-time" type="time" defaultValue="09:00" className="text-[10px] theme-bg-primary theme-border border rounded px-1 py-0.5 theme-text-primary" />
                                    <button
                                        onClick={() => {
                                            const sel = document.getElementById('pomo-sched-days') as HTMLSelectElement;
                                            const timeInput = document.getElementById('pomo-sched-time') as HTMLInputElement;
                                            const days = Array.from(sel.selectedOptions).map(o => parseInt(o.value));
                                            const [h, m] = (timeInput.value || '09:00').split(':').map(Number);
                                            if (days.length > 0) {
                                                onPomodoroScheduleChange?.([...pomodoroSchedule, { days, startHour: h, startMinute: m }]);
                                            }
                                        }}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-400 hover:bg-blue-600/50"
                                    >Add</button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            </div>
        </div>
    );
};

export default StatusBar;
