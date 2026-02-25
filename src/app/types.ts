export type ElementType = 'text' | 'image' | 'region';
export type RuleType = 'InsertAllow' | 'DeleteAllow' | 'ChangeAny' | 'ChangeSpecific' | 'MustMatch' | 'Other';

export interface CanvasElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    w: number;
    h: number;
    text?: string;
    src?: string;
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
}

export interface Rule {
    id: string;
    elementId: string;
    type: RuleType;
    targetText?: string; // Add this to allow applying rules to specific substrings
    allowedKeywords?: string;
    expectedText?: string;
    prefixAllowed?: boolean;
    suffixAllowed?: boolean;
    customInstruction?: string;
}

export interface InspectionResultItem {
    ruleId: string;
    elementId: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    reason: string;
    region: { x: number; y: number; w: number; h: number };
}

export interface InspectionResult {
    matchRate: number;
    items: InspectionResultItem[];
}
