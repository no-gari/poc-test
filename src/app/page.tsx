"use client";

import { useState } from "react";
import RuleMaker from "./components/RuleMaker";
import Validator from "./components/Validator";
import { Rule, CanvasElement } from "./types";

export default function Home() {
    const [currentPhase, setCurrentPhase] = useState<1 | 2>(1);
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);

    const startNextPhase = () => {
        setCurrentPhase(2);
    };

    const goBack = () => {
        setCurrentPhase(1);
    };

    return (
        <main className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
            <header className="bg-white border-b text-[#1428A0] p-4 drop-shadow-sm sticky top-0 z-50 flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight">Samsung Card AI Inspector - PoC</h1>
                <div className="flex gap-4">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${currentPhase === 1 ? 'bg-[#1428A0] text-white shadow' : 'bg-gray-100 text-gray-500'}`}>
                        1. Rule Maker
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${currentPhase === 2 ? 'bg-[#1428A0] text-white shadow' : 'bg-gray-100 text-gray-500'}`}>
                        2. AI Validator
                    </span>
                </div>
            </header>

            {currentPhase === 1 && (
                <RuleMaker
                    elements={elements}
                    setElements={setElements}
                    rules={rules}
                    setRules={setRules}
                    onNext={startNextPhase}
                />
            )}

            {currentPhase === 2 && (
                <Validator elements={elements} rules={rules} onBack={goBack} />
            )}
        </main>
    );
}
