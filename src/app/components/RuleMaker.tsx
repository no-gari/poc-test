"use client";

import React, { useState, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { CanvasElement, Rule, RuleType, ElementType } from '../types';
import { Type, Square, Trash2, Plus, Code, MousePointer2 } from 'lucide-react';

interface RuleMakerProps {
    elements: CanvasElement[];
    setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
    rules: Rule[];
    setRules: React.Dispatch<React.SetStateAction<Rule[]>>;
    onNext: () => void;
}

type ToolMode = 'select' | 'draw_region';

export default function RuleMaker({ elements, setElements, rules, setRules, onNext }: RuleMakerProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [devMode, setDevMode] = useState(false);

    // Tools State
    const [toolMode, setToolMode] = useState<ToolMode>('select');

    // Interaction States
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDrawStartOffset] = useState({ x: 0, y: 0 });
    const [editingTextId, setEditingTextId] = useState<string | null>(null);

    const [drawingRegion, setDrawingRegion] = useState<CanvasElement | null>(null);
    const [drawOrigin, setDrawOrigin] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    React.useEffect(() => {
        const updateScale = () => {
            if (wrapperRef.current) {
                const { width, height } = wrapperRef.current.getBoundingClientRect();
                const scaleX = (width - 32) / 1200; // 32px horizontal padding
                const scaleY = (height - 80) / 700; // 80px vertical padding
                const newScale = Math.min(scaleX, scaleY, 1);
                setScale(newScale > 0.1 ? newScale : 0.1);
            }
        };
        // Initial setup
        setTimeout(updateScale, 50);
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    const addTextElement = () => {
        const newEl: CanvasElement = {
            id: Math.random().toString(36).substring(7),
            type: 'text',
            x: 50,
            y: 50,
            w: 250,
            h: 50,
            text: '',
            fontSize: 18,
            textAlign: 'left'
        };
        setElements([...elements, newEl]);
        setSelectedId(newEl.id);
        setToolMode('select');
    };

    const handlePointerDown = (e: ReactMouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        if (toolMode === 'draw_region') {
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;
            setDrawOrigin({ x, y });
            setDrawingRegion({
                id: Math.random().toString(36).substring(7),
                type: 'region',
                x, y, w: 0, h: 0
            });
            return;
        }

        // Click on empty space in select mode
        setSelectedId(null);
        setEditingTextId(null);
    };

    const handleElementPointerDown = (e: ReactMouseEvent, id: string, action: 'drag' | 'resize' = 'drag') => {
        if (toolMode === 'draw_region') return; // let canvas handle it
        e.stopPropagation(); // Stop propagation before returning so it doesn't trigger canvas deselect

        if (editingTextId === id) return; // Prevent drag/resize while typing
        setSelectedId(id);

        const el = elements.find(el => el.id === id);
        const rect = containerRef.current?.getBoundingClientRect();
        if (!el || !rect) return;

        if (action === 'drag') {
            setIsDragging(true);
            setDrawStartOffset({
                x: (e.clientX - rect.left) / scale - el.x,
                y: (e.clientY - rect.top) / scale - el.y
            });
        } else {
            setIsResizing(true);
            setDrawStartOffset({
                x: e.clientX,
                y: e.clientY
            });
        }
    };

    const handlePointerMove = (e: ReactMouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        if (toolMode === 'draw_region' && drawingRegion) {
            const currentX = (e.clientX - rect.left) / scale;
            const currentY = (e.clientY - rect.top) / scale;

            const newX = Math.min(drawOrigin.x, currentX);
            const newY = Math.min(drawOrigin.y, currentY);
            const newW = Math.abs(currentX - drawOrigin.x);
            const newH = Math.abs(currentY - drawOrigin.y);

            setDrawingRegion({
                ...drawingRegion,
                x: newX,
                y: newY,
                w: newW,
                h: newH
            });
            return;
        }

        if (!selectedId || (!isDragging && !isResizing)) return;

        let updatedElements = [...elements];
        const idx = updatedElements.findIndex(el => el.id === selectedId);
        if (idx === -1) return;

        if (isDragging) {
            updatedElements[idx].x = (e.clientX - rect.left) / scale - dragOffset.x;
            updatedElements[idx].y = (e.clientY - rect.top) / scale - dragOffset.y;
        } else if (isResizing) {
            const dx = (e.clientX - dragOffset.x) / scale;
            const dy = (e.clientY - dragOffset.y) / scale;
            updatedElements[idx].w = Math.max(30, updatedElements[idx].w + dx);
            updatedElements[idx].h = Math.max(30, updatedElements[idx].h + dy);
            setDrawStartOffset({ x: e.clientX, y: e.clientY });
        }

        setElements(updatedElements);
    };

    const handlePointerUp = () => {
        if (toolMode === 'draw_region') {
            if (drawingRegion && drawingRegion.w > 10 && drawingRegion.h > 10) {
                setElements([...elements, drawingRegion]);
                setSelectedId(drawingRegion.id);
            }
            setDrawingRegion(null);
            setToolMode('select');
            return;
        }
        setIsDragging(false);
        setIsResizing(false);
    };

    const addNewRuleForSelected = () => {
        if (!selectedId) return;
        const newRule: Rule = {
            id: Math.random().toString(36).substring(7),
            elementId: selectedId,
            type: 'MustMatch',
        };
        setRules([...rules, newRule]);
    };

    const updateRule = (ruleId: string, updates: Partial<Rule>) => {
        const updatedRules = rules.map(r => r.id === ruleId ? { ...r, ...updates } : r);
        setRules(updatedRules);
    };

    const removeRule = (ruleId: string) => {
        setRules(rules.filter(r => r.id !== ruleId));
    };

    const removeElement = (id: string) => {
        setElements(elements.filter(el => el.id !== id));
        setRules(rules.filter(r => r.elementId !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const handleTextSelection = () => {
        if (!selectedId) return;
        const selection = window.getSelection();
        if (selection && selection.toString().trim() !== '') {
            const selectedText = selection.toString().trim();
            // Create a new rule for this specific text automatically
            const newRule: Rule = {
                id: Math.random().toString(36).substring(7),
                elementId: selectedId,
                type: 'MustMatch',
                targetText: selectedText,
            };
            setRules([...rules, newRule]);

            // Clear selection so they don't accidentally create it twice
            selection.removeAllRanges();
        }
    };

    const updateElementStyle = (updates: Partial<CanvasElement>) => {
        if (!selectedId) return;
        setElements(elements.map(el => el.id === selectedId ? { ...el, ...updates } : el));
    };

    const selectedElement = elements.find(e => e.id === selectedId);
    const rulesForSelected = rules.filter(r => r.elementId === selectedId);

    const ruleDisplayNames: Record<RuleType, string> = {
        MustMatch: '일치해야 함 (Must Match)',
        InsertAllow: '문구 추가 허용 (Insert Allow)',
        DeleteAllow: '삭제 허용 (Delete Allow)',
        ChangeAny: '아무 문구로 수정 가능 (Change Any)',
        ChangeSpecific: '특정 문구로만 변경 가능 (Change Specific)',
        Other: '기타 (자유 입력)'
    };

    const renderTextWithHighlights = (el: CanvasElement, elementRules: Rule[]) => {
        if (!el.text) return <span className="text-gray-300">텍스트를 입력하세요</span>;
        let renderedText = [] as React.ReactNode[];
        let lastIndex = 0;

        const highlightableRules = elementRules.filter(r => r.targetText && el.text!.includes(r.targetText))
            .sort((a, b) => el.text!.indexOf(a.targetText!) - el.text!.indexOf(b.targetText!));

        if (highlightableRules.length === 0) {
            return <span>{el.text}</span>;
        }

        highlightableRules.forEach((rule) => {
            const target = rule.targetText!;
            const matchIndex = el.text!.indexOf(target, lastIndex);
            if (matchIndex === -1) return;

            if (matchIndex > lastIndex) {
                renderedText.push(<span key={`text-${lastIndex}`}>{el.text!.substring(lastIndex, matchIndex)}</span>);
            }

            renderedText.push(
                <span key={`hl-${rule.id}`} className="bg-[#1428A0]/20 text-[#1428A0] font-bold rounded px-1 -mx-1" title={ruleDisplayNames[rule.type]}>
                    {target}
                </span>
            );
            lastIndex = matchIndex + target.length;
        });

        if (lastIndex < el.text.length) {
            renderedText.push(<span key={`text-${lastIndex}`}>{el.text.substring(lastIndex)}</span>);
        }

        return renderedText;
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
            {/* ToolBar */}
            <div className="flex items-center justify-between p-3 bg-white border-b shadow-sm z-10 w-full px-6">
                <div className="flex items-center gap-3">
                    <button onClick={addTextElement} className="flex items-center gap-1.5 border px-4 py-2 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 font-medium transition-colors shadow-sm focus:ring-2 focus:ring-[#1428A0]/50">
                        <Type size={16} /> 텍스트 추가
                    </button>

                    <button
                        onClick={() => setToolMode(toolMode === 'draw_region' ? 'select' : 'draw_region')}
                        className={`flex items-center gap-1.5 border px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm focus:ring-2 focus:ring-[#1428A0]/50 ${toolMode === 'draw_region' ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                        <Square size={16} /> 영역 지정 (드래그)
                    </button>

                    {/* Formatting Tools (Only show when text is selected) */}
                    {selectedElement?.type === 'text' && (
                        <div className="flex items-center gap-2 border-l border-gray-300 pl-4 animate-in fade-in zoom-in duration-200">
                            <span className="text-xs text-gray-500 font-bold mr-1">텍스트 편집:</span>

                            {/* Font Size */}
                            <div className="flex bg-gray-50 rounded-lg border shadow-sm">
                                <button
                                    className="px-2 py-1.5 hover:bg-gray-200"
                                    onClick={() => updateElementStyle({ fontSize: Math.max(10, (selectedElement.fontSize || 18) - 2) })}
                                >-</button>
                                <span className="px-3 py-1.5 text-sm font-medium border-x border-gray-200 min-w-[40px] text-center">
                                    {selectedElement.fontSize || 18}
                                </span>
                                <button
                                    className="px-2 py-1.5 hover:bg-gray-200"
                                    onClick={() => updateElementStyle({ fontSize: Math.min(100, (selectedElement.fontSize || 18) + 2) })}
                                >+</button>
                            </div>

                            {/* Alignment */}
                            <div className="flex bg-gray-50 rounded-lg border shadow-sm shadow-sm overflow-hidden text-sm font-bold text-gray-600">
                                <button
                                    className={`px-3 py-1.5 hover:bg-gray-200 ${selectedElement.textAlign === 'left' || !selectedElement.textAlign ? 'bg-blue-100 text-[#1428A0]' : ''}`}
                                    onClick={() => updateElementStyle({ textAlign: 'left' })}
                                >좌</button>
                                <button
                                    className={`px-3 py-1.5 border-x border-gray-200 hover:bg-gray-200 ${selectedElement.textAlign === 'center' ? 'bg-blue-100 text-[#1428A0]' : ''}`}
                                    onClick={() => updateElementStyle({ textAlign: 'center' })}
                                >중</button>
                                <button
                                    className={`px-3 py-1.5 hover:bg-gray-200 ${selectedElement.textAlign === 'right' ? 'bg-blue-100 text-[#1428A0]' : ''}`}
                                    onClick={() => updateElementStyle({ textAlign: 'right' })}
                                >우</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer font-medium hover:text-gray-900 transition-colors">
                        <input type="checkbox" checked={devMode} onChange={(e) => setDevMode(e.target.checked)} className="peer sr-only" />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1428A0] relative"></div>
                        Dev Mode
                    </label>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row h-full">
                {/* Canvas Area (광고안) */}
                <div
                    ref={wrapperRef}
                    className={`flex-1 overflow-hidden bg-[#F3F4F6] p-4 flex flex-col items-center justify-center h-full ${toolMode === 'draw_region' ? 'cursor-crosshair' : ''}`}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                    onPointerLeave={handlePointerUp}
                >
                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }} className="flex flex-col items-center">
                        <div className="w-[1200px] mb-3 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-extrabold text-[#1428A0] tracking-tight">광고안 (Draft Canvas)</h2>
                            <span className="text-xs text-gray-400 font-medium">1200 x 700 (Scale: {Math.round(scale * 100)}%)</span>
                        </div>

                        <div
                            ref={containerRef}
                            onPointerDown={handlePointerDown}
                            className="w-[1200px] h-[700px] bg-white rounded-xl shadow-lg relative overflow-hidden border border-gray-200 shrink-0 select-none"
                            style={{ minWidth: 1200, minHeight: 700 }}
                        >
                            {elements.map((el) => {
                                const elementRules = rules.filter(r => r.elementId === el.id);
                                const isSelected = el.id === selectedId;
                                const isEditing = editingTextId === el.id;

                                return (
                                    <div
                                        key={el.id}
                                        className={`absolute group cursor-move transition-shadow ${isSelected ? 'ring-2 ring-[#1428A0] z-20 shadow-md bg-white' : 'hover:ring-1 hover:ring-gray-300 z-10 bg-transparent'} ${el.type === 'region' && !isSelected ? 'border border-dashed border-gray-400 bg-blue-50/10' : ''}`}
                                        style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
                                        onPointerDown={(e) => handleElementPointerDown(e, el.id, 'drag')}
                                        onPointerUp={handleTextSelection}
                                        onDoubleClick={(e) => { e.stopPropagation(); if (toolMode === 'select' && el.type === 'text') setEditingTextId(el.id); }}
                                    >
                                        {el.type === 'text' && (
                                            isEditing ? (
                                                <textarea
                                                    autoFocus
                                                    placeholder="텍스트를 입력하세요"
                                                    value={el.text || ''}
                                                    onChange={(e) => {
                                                        const newElems = [...elements];
                                                        const i = newElems.findIndex(e => e.id === el.id);
                                                        newElems[i].text = e.target.value;
                                                        setElements(newElems);
                                                    }}
                                                    className="w-full h-full bg-transparent resize-none border-none outline-none p-2 pointer-events-auto leading-relaxed shadow-inner"
                                                    style={{ fontSize: `${el.fontSize || 18}px`, textAlign: el.textAlign || 'left' }}
                                                    onBlur={() => setEditingTextId(null)}
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full p-2 pointer-events-none break-keep overflow-hidden leading-relaxed"
                                                    style={{ fontSize: `${el.fontSize || 18}px`, textAlign: el.textAlign || 'left' }}
                                                >
                                                    {renderTextWithHighlights(el, elementRules)}
                                                </div>
                                            )
                                        )}
                                        {el.type === 'image' && el.src && (
                                            <img src={el.src} alt="Uploaded" className="w-full h-full object-cover pointer-events-none rounded-sm" />
                                        )}
                                        {el.type === 'region' && (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400/50 pointer-events-none select-none">
                                                지정 영역
                                            </div>
                                        )}

                                        {!isEditing && elementRules.length > 0 && isSelected && (
                                            <div className="absolute -top-7 left-0 bg-[#1428A0] text-white font-medium text-xs px-2 py-1 rounded-md shadow-lg z-10 whitespace-nowrap">
                                                {elementRules.length}개의 규칙 적용됨
                                            </div>
                                        )}

                                        {isSelected && toolMode === 'select' && (
                                            <div
                                                className="absolute right-0 bottom-0 w-5 h-5 bg-white border-2 border-[#1428A0] rounded-full cursor-nwse-resize translate-x-1/2 translate-y-1/2 shadow-sm"
                                                onPointerDown={(e) => handleElementPointerDown(e, el.id, 'resize')}
                                            />
                                        )}
                                    </div>
                                );
                            })}

                            {/* Render active drawing region */}
                            {drawingRegion && (
                                <div
                                    className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
                                    style={{
                                        left: drawingRegion.x,
                                        top: drawingRegion.y,
                                        width: drawingRegion.w,
                                        height: drawingRegion.h
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel (비고 / Rule Details) */}
                <div className="w-full md:w-96 bg-white border-l shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] overflow-y-auto flex flex-col h-full z-10">
                    <div className="p-5 border-b sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex justify-between items-center">
                        <h3 className="text-xl font-extrabold text-[#1428A0] tracking-tight">비고 (Rule Details)</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">{rules.length} Rules</span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col gap-6">
                        {selectedElement ? (
                            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="flex items-center gap-2 font-bold text-sm text-gray-700">
                                        <MousePointer2 size={16} className="text-[#1428A0]" />
                                        {selectedElement.type === 'text' ? '텍스트 요소 선택됨' : selectedElement.type === 'region' ? '지정 영역 선택됨' : '이미지 요소 선택됨'}
                                    </span>
                                    <button onClick={() => removeElement(selectedElement.id)} className="text-red-500 hover:text-white hover:bg-red-500 p-1.5 rounded transition-colors" title="요소 삭제">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {selectedElement.type === 'text' && (
                                    <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3 rounded-lg font-medium flex items-start gap-2 animate-in slide-in-from-top-2">
                                        <span className="text-[16px] leading-none">💡</span>
                                        <p>캔버스에서 방금 적은 <b>텍스트의 일부를 마우스 드래그</b>하면 손쉽게 부분 규칙이 알아서 등록됩니다!</p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-1.5">선택된 요소의 규칙</h4>
                                        <button onClick={addNewRuleForSelected} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1 transition-colors">
                                            <Plus size={12} /> 추가
                                        </button>
                                    </div>

                                    {rulesForSelected.length === 0 && (
                                        <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded text-center border border-dashed">적용된 규칙이 없습니다.</p>
                                    )}

                                    {rulesForSelected.map((rule, index) => (
                                        <div key={rule.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.1)] relative group hover:border-[#1428A0]/30 transition-colors">
                                            <div className="flex justify-between items-center">
                                                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider">Rule #{index + 1}</span>
                                                <button onClick={() => removeRule(rule.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {selectedElement.type === 'text' && (
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[11px] font-bold text-gray-500">부분 적용할 단어 (선택, 비워두면 전체 적용)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="예) 최대 50,000원"
                                                        className="border p-2 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-[#1428A0]/30 focus:border-[#1428A0] transition-all bg-gray-50"
                                                        value={rule.targetText || ''}
                                                        onChange={(e) => updateRule(rule.id, { targetText: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[11px] font-bold text-gray-500">규칙 유형</label>
                                                <select
                                                    className="border p-2 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-[#1428A0]/30 focus:border-[#1428A0] transition-all bg-gray-50 font-medium text-gray-700"
                                                    value={rule.type || ''}
                                                    onChange={(e) => updateRule(rule.id, { type: e.target.value as RuleType })}
                                                >
                                                    <option value="MustMatch">일치해야 함 (Must Match)</option>
                                                    <option value="InsertAllow">문구 추가 허용 (Insert Allow)</option>
                                                    <option value="DeleteAllow">삭제 허용 (Delete Allow)</option>
                                                    <option value="ChangeAny">아무 문구로 수정 가능 (Change Any)</option>
                                                    <option value="ChangeSpecific">특정 문구로만 변경 가능 (Specific)</option>
                                                    <option value="Other">기타 (자유 입력)</option>
                                                </select>
                                            </div>

                                            {rule.type === 'ChangeSpecific' && (
                                                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <label className="text-[11px] font-bold text-[#1428A0]">허용할 특정 문구 리스트</label>
                                                    <input
                                                        type="text"
                                                        placeholder="예) VISA, Master, AMEX"
                                                        className="border border-blue-200 bg-blue-50/30 p-2 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                                        value={rule.allowedKeywords || ''}
                                                        onChange={(e) => updateRule(rule.id, { allowedKeywords: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            {rule.type === 'MustMatch' && selectedElement.type === 'text' && !rule.targetText && (
                                                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <label className="text-[11px] font-bold text-gray-500">예상 텍스트 (옵션)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="비워두면 에디터의 텍스트가 기준"
                                                        className="border p-2 rounded-lg text-sm w-full outline-none bg-gray-50"
                                                        value={rule.expectedText || ''}
                                                        onChange={(e) => updateRule(rule.id, { expectedText: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            {rule.type === 'Other' && (
                                                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <label className="text-[11px] font-bold text-[#1428A0]">자유 입력 규칙 내용</label>
                                                    <textarea
                                                        placeholder="예) 이 부분에는 삼성카드 로고 최신 버전만 와야 합니다."
                                                        className="border border-blue-200 bg-blue-50/30 p-2 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none h-20"
                                                        value={rule.customInstruction || ''}
                                                        onChange={(e) => updateRule(rule.id, { customInstruction: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center gap-3">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                                    <MousePointer2 size={20} />
                                </div>
                                <p className="text-sm font-medium text-gray-600">캔버스에서 요소나 영역을 선택하면<br />이곳에 상세 규칙을 설정할 수 있습니다.</p>
                            </div>
                        )}

                        <div className="mt-4 border-t pt-6">
                            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                                <span>전체 규칙 요약</span>
                            </h4>
                            {rules.length === 0 ? (
                                <p className="text-[11px] text-gray-400">설정된 규칙이 없습니다.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {rules.map((rule, idx) => {
                                        const el = elements.find(e => e.id === rule.elementId);
                                        // Generate smart preview string
                                        let previewStr = el?.type === 'image' ? '🖼️ 이미지 영역' : el?.type === 'region' ? '🔲 지정 영역 (박스)' : '📝 (빈 텍스트)';
                                        if (el?.type === 'text' && el.text) {
                                            if (rule.targetText) {
                                                previewStr = `"${rule.targetText}" (전체: ${el.text.substring(0, 10)}...)`;
                                            } else {
                                                previewStr = `"${el.text.substring(0, 20)}${el.text.length > 20 ? '...' : ''}"`;
                                            }
                                        }

                                        return (
                                            <li key={rule.id} className="text-sm border border-gray-100 p-2.5 rounded-lg bg-gray-50 shadow-sm flex flex-col gap-1.5 hover:border-gray-300 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-[#1428A0] text-xs px-1.5 py-0.5 bg-blue-100/50 rounded">{ruleDisplayNames[rule.type]}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold bg-white px-1 border rounded">Rule {idx + 1}</span>
                                                </div>
                                                <span className="text-xs text-gray-600 font-medium truncate" title={previewStr}>{previewStr}</span>
                                                {rule.type === 'ChangeSpecific' && <div className="text-[11px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-sm self-start inline-block">허용: {rule.allowedKeywords || '없음'}</div>}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {devMode && (
                            <div className="mt-8 border-t pt-4">
                                <h4 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Code size={12} /> Dev Mode Preview</h4>
                                <pre className="bg-gray-900 text-green-400 p-3 text-[10px] rounded-lg overflow-x-auto max-h-40 leading-tight">
                                    {JSON.stringify({ elements, rules }, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>

                    <div className="p-5 border-t bg-gray-50 shrink-0">
                        <button
                            className="w-full bg-[#1428A0] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-[#0c1966] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                            onClick={onNext}
                        >
                            규칙 저장 및 진행
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
