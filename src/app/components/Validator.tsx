"use client";

import React, { useState } from "react";
import { Rule, CanvasElement, InspectionResult, InspectionResultItem } from "../types";
import { CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCcw, ArrowLeft } from "lucide-react";

interface ValidatorProps {
    elements: CanvasElement[];
    rules: Rule[];
    onBack: () => void;
}

export default function Validator({ elements, rules, onBack }: ValidatorProps) {
    const [actualImage, setActualImage] = useState<string | null>(null);
    const [base64Image, setBase64Image] = useState<string | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'DONE'>('IDLE');
    const [result, setResult] = useState<InspectionResult | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setActualImage(URL.createObjectURL(file));

            const reader = new FileReader();
            reader.onloadend = () => {
                setBase64Image(reader.result as string);
            };
            reader.readAsDataURL(file);

            setStatus('IDLE');
            setResult(null);
        }
    };

    const runInspection = async () => {
        if (!base64Image) return;
        setStatus('LOADING');

        try {
            const response = await fetch('/api/inspect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actualImage: base64Image,
                    elements,
                    rules
                })
            });

            if (!response.ok) {
                setStatus('IDLE');
                alert("검사에 실패했습니다. GEMINI_API_KEY가 올바르게 설정되었는지 확인해주세요.");
                return;
            }

            const data = await response.json();
            setResult(data);
            setStatus('DONE');
        } catch (error) {
            console.error("Error running inspection:", error);
            setStatus('IDLE');
            alert("검사 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
            <div className="flex flex-1 overflow-hidden flex-col md:flex-row h-full">
                {/* 실제 화면 표시 영역 (결과 캔버스) */}
                <div className="flex-1 overflow-auto bg-[#F3F4F6] p-4 flex flex-col items-center justify-start h-full">
                    <div className="w-[1200px] mb-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={onBack} className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 font-bold shadow-sm flex items-center gap-1.5 transition-colors">
                                <ArrowLeft size={16} /> 이전
                            </button>
                            <h2 className="text-xl font-extrabold text-[#1428A0] tracking-tight">실제 실행 이미지 업로드 및 검증</h2>
                        </div>
                    </div>

                    <div className="bg-white flex-1 relative rounded-xl border border-gray-200 shadow-lg shrink-0 flex items-center justify-center p-4 w-[1200px] min-h-[700px] overflow-hidden">
                        {!actualImage ? (
                            <label className="border-2 border-dashed border-gray-300 bg-gray-50/50 hover:bg-gray-100 hover:border-blue-400 rounded-2xl p-12 cursor-pointer w-full max-w-lg text-center flex flex-col items-center justify-center space-y-4 transition-all">
                                <div className="w-16 h-16 bg-blue-100 text-[#1428A0] rounded-full flex items-center justify-center mb-2 shadow-sm">
                                    <CheckCircle size={32} />
                                </div>
                                <span className="text-gray-600 font-bold text-lg">클릭하여 실제 집행할 광고 이미지를 업로드하세요</span>
                                <span className="text-sm text-gray-400">사전에 설정된 규칙이 적용되어 자동으로 평가됩니다.</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        ) : (
                            <div className="relative inline-block w-full h-full bg-gray-100 flex items-center justify-center rounded-lg shadow-inner overflow-hidden">
                                <div className="relative inline-block border bg-white shadow-md">
                                    <img src={actualImage} alt="Actual Execution" className="max-w-none block object-contain" style={{ maxHeight: '80vh' }} />

                                    {status === 'DONE' && result?.items.map((res) => {
                                        const borderColors = {
                                            PASS: 'border-green-500',
                                            FAIL: 'border-red-500',
                                            WARN: 'border-yellow-500'
                                        };
                                        const bgColors = {
                                            PASS: 'bg-green-500/20',
                                            FAIL: 'bg-red-500/20',
                                            WARN: 'bg-yellow-500/20'
                                        };
                                        const badgeColors = {
                                            PASS: 'bg-green-600 text-white',
                                            FAIL: 'bg-red-600 text-white',
                                            WARN: 'bg-yellow-500 text-white'
                                        };

                                        return (
                                            <div
                                                key={res.ruleId}
                                                className={`absolute border-[3px] ${borderColors[res.status]} ${bgColors[res.status]} shadow-lg transition-all duration-300 ring-2 ring-white/50 backdrop-blur-[1px]`}
                                                style={{ left: res.region.x, top: res.region.y, width: res.region.w, height: res.region.h }}
                                            >
                                                <span className={`absolute -top-7 left-[-3px] text-xs px-2.5 py-1 font-bold rounded shadow-md flex items-center gap-1 whitespace-nowrap ${badgeColors[res.status]}`}>
                                                    {res.status === 'PASS' && <CheckCircle size={14} />}
                                                    {res.status === 'FAIL' && <XCircle size={14} />}
                                                    {res.status === 'WARN' && <AlertTriangle size={14} />}
                                                    {res.status}
                                                </span>
                                            </div>
                                        );
                                    })}

                                    {status === 'LOADING' && (
                                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center backdrop-blur z-20 transition-all rounded-lg">
                                            <Loader2 className="w-16 h-16 text-[#1428A0] animate-spin mb-6" />
                                            <p className="text-2xl font-black text-[#1428A0] animate-pulse tracking-tight">AI 검사 수행 중...</p>
                                            <p className="text-gray-500 font-medium mt-2">Gemini 3 Flash Preview 모델이 문맥을 평가하고 있습니다.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 결과 리포트 영역 */}
                <div className="w-full md:w-96 bg-white border-l shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] overflow-y-auto flex flex-col h-full z-10">
                    <div className="p-5 border-b sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col gap-4">
                        <h3 className="text-xl font-extrabold text-[#1428A0] tracking-tight">검사 대상 (Action)</h3>
                        {actualImage ? (
                            <button
                                onClick={runInspection}
                                disabled={status === 'LOADING'}
                                className="w-full bg-[#1428A0] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-[#0c1966] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                            >
                                ✨ {status === 'LOADING' ? '분석 중...' : 'AI 문맥 검사 실행'}
                            </button>
                        ) : (
                            <div className="text-sm text-gray-500 border-2 border-dashed border-gray-200 p-4 rounded-xl bg-gray-50 text-center font-medium">
                                이미지를 업로드하면 검사가 활성화됩니다.
                            </div>
                        )}
                    </div>

                    {status === 'DONE' && result && (
                        <div className="p-5 flex-1 flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-500 bg-gray-50/50">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">검사 리포트</h3>
                                <button onClick={runInspection} className="text-[11px] bg-white border px-2 py-1 rounded shadow-sm text-gray-600 font-bold hover:bg-gray-100 flex items-center gap-1 transition-colors">
                                    <RefreshCcw size={12} /> 다시 검사
                                </button>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col mb-6 shadow-sm">
                                <span className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Total Match Rate</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-5xl font-black tracking-tighter ${result.matchRate === 100 ? 'text-green-500' : result.matchRate >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {result.matchRate}%
                                    </span>
                                    {result.matchRate === 100 && <CheckCircle className="text-green-500 mb-2" size={28} />}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">항목별 평가 결과</h4>
                                {result.items.map((item, idx) => {
                                    const isPass = item.status === 'PASS';
                                    const isWarn = item.status === 'WARN';
                                    const bg = isPass ? 'bg-green-50/60 hover:bg-green-50' : isWarn ? 'bg-yellow-50/60 hover:bg-yellow-50' : 'bg-red-50/60 hover:bg-red-50';
                                    const border = isPass ? 'border-green-200/50' : isWarn ? 'border-yellow-200/50' : 'border-red-200/50';
                                    const text = isPass ? 'text-green-800' : isWarn ? 'text-yellow-800' : 'text-red-800';

                                    return (
                                        <div key={item.ruleId} className={`p-4 rounded-xl shadow-sm border ${bg} ${border} transition-colors group cursor-default`}>
                                            <div className="flex gap-3">
                                                <div className="shrink-0 mt-0.5">
                                                    {isPass ? <CheckCircle className="text-green-500 drop-shadow-sm" size={20} /> : isWarn ? <AlertTriangle className="text-yellow-500 drop-shadow-sm" size={20} /> : <XCircle className="text-red-500 drop-shadow-sm" size={20} />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className={`font-black tracking-tight text-sm ${text}`}>
                                                            Rule #{idx + 1}
                                                        </span>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest text-white ${isPass ? 'bg-green-500' : isWarn ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 leading-relaxed font-medium break-keep">{item.reason}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {result.items.some(i => i.status === 'FAIL') && (
                                <div className="mt-8 p-5 bg-red-50 rounded-2xl border border-red-200 shadow-inner">
                                    <p className="text-red-800 font-extrabold text-sm flex items-center gap-2 mb-1.5">
                                        <AlertTriangle size={18} />
                                        위반 경고 (Critical Issue)
                                    </p>
                                    <p className="text-red-700 text-xs pl-6 break-keep leading-relaxed font-medium">
                                        필수 고지문이 누락되거나 허락되지 않은 문구의 임의 삭제/변경이 감지되었습니다. 빨간색으로 표기된 영역을 중점적으로 재검토하시기 바랍니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
