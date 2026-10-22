import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Wrench, ChevronDown, X, Check } from 'lucide-react';

interface ToolDropdownProps {
    tools: any[];
    selectedTool: any;
    onSelectTool: (tool: any) => void;
    onClearTool: () => void;
    loading?: boolean;
    disabled?: boolean;
    className?: string;
}

export const ToolDropdown: React.FC<ToolDropdownProps> = ({
    tools,
    selectedTool,
    onSelectTool,
    onClearTool,
    loading = false,
    disabled = false,
    className = ''
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [pos, setPos] = useState<{ bottom: number; left: number; width: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const filteredTools = useMemo(() => {
        if (!search.trim()) return tools;
        const q = search.toLowerCase();
        return tools.filter((t: any) =>
            (t.name || '').toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q) ||
            (t.group || '').toLowerCase().includes(q)
        );
    }, [tools, search]);

    useEffect(() => {
        if (!open) {
            setPos(null);
            return;
        }
        setSearch('');
        setTimeout(() => searchRef.current?.focus(), 50);
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) {
            setPos({
                bottom: window.innerHeight - rect.top + 4,
                left: rect.left,
                width: rect.width
            });
        }
        const onResize = () => {
            const r = wrapperRef.current?.getBoundingClientRect();
            if (r) setPos({ bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width });
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const label = loading ? '...' : selectedTool ? selectedTool.name : 'Tool';

    const dropdown = open && !loading && pos && (
        <div
            className="fixed z-[100] theme-bg-primary backdrop-blur-xl theme-border border rounded-lg shadow-2xl overflow-hidden"
            style={{ bottom: pos.bottom, left: pos.left, width: Math.max(pos.width, 280) }}
        >
            <div className="px-2 py-1.5 border-b theme-border flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Select a tool</span>
                <button
                    onClick={() => { onClearTool(); setOpen(false); }}
                    className="text-[10px] text-gray-500 hover:text-gray-300"
                >
                    Clear
                </button>
            </div>
            <div className="px-2 py-1.5 border-b theme-border">
                <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tools..."
                    className="w-full theme-input border theme-border rounded px-2 py-1 text-xs theme-text-primary placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                    onKeyDown={(e) => e.stopPropagation()}
                />
            </div>
            <div className="max-h-72 overflow-y-auto p-1">
                {filteredTools.length === 0 && (
                    <div className="px-2 py-3 text-xs text-gray-500 text-center">No tools found</div>
                )}
                {filteredTools.map((tool: any) => {
                    const isSelected = selectedTool && selectedTool.name === tool.name;
                    const isEnabled = !!tool.enabled;
                    return (
                        <button
                            key={`${tool.origin || 'tool'}-${tool.name}`}
                            type="button"
                            onClick={() => { onSelectTool(tool); setOpen(false); }}
                            className={`w-full text-left rounded-lg border px-2 py-1.5 mb-1 text-xs transition ${
                                isSelected
                                    ? 'border-blue-400/50 bg-blue-500/15 text-blue-200'
                                    : 'border-transparent hover:bg-white/5 text-gray-300'
                            }`}
                            title={tool.description || ''}
                        >
                            <div className="flex items-center gap-2">
                                <Wrench size={12} className={`flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`} />
                                <span className="font-medium truncate">{tool.name}</span>
                                {tool.group && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-gray-700/50 text-gray-400 flex-shrink-0">{tool.group}</span>
                                )}
                                {isEnabled && (
                                    <span className="ml-auto flex items-center gap-1 text-[9px] text-emerald-400 flex-shrink-0">
                                        <Check size={10} /> enabled
                                    </span>
                                )}
                            </div>
                            {tool.description && (
                                <div className="mt-0.5 text-[10px] text-gray-500 line-clamp-2 pl-5">{tool.description}</div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div ref={wrapperRef} className={`relative flex-1 min-w-0 ${className}`}>
            <div className={`w-full h-7 flex items-center justify-center gap-1 rounded-lg text-xs font-medium transition-all duration-200 border px-2 ${
                selectedTool
                    ? 'bg-gradient-to-br from-blue-500/30 to-cyan-600/30 text-blue-200 border-blue-400/40'
                    : 'theme-bg-secondary theme-text-secondary theme-border theme-hover'
            }`}>
                <button
                    type="button"
                    disabled={disabled || loading}
                    onClick={() => setOpen((v) => !v)}
                    className="flex-1 flex items-center justify-center gap-1 min-w-0"
                >
                    <Wrench size={12} className="flex-shrink-0 opacity-70" />
                    <span className="truncate">{label}</span>
                    <ChevronDown size={12} className={`transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
                </button>
                {selectedTool && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onClearTool(); }}
                        className="ml-0.5 p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200"
                        title="Clear tool"
                    >
                        <X size={10} />
                    </button>
                )}
            </div>
            {dropdown && createPortal(dropdown, document.body)}
        </div>
    );
};

export default ToolDropdown;
