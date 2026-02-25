import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Rule, CanvasElement } from '../../types';

// Let's actually initialize Gemini here
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const maxDuration = 60; // Allows up to 60s for the API call

function base64ToGenerativePart(dataURI: string) {
    const matches = dataURI.match(/^data:(.+?);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 data URI');
    }
    return {
        inlineData: {
            data: matches[2],
            mimeType: matches[1]
        },
    };
}

export async function POST(req: Request) {
    try {
        const { actualImage, elements, rules } = await req.json();

        if (!actualImage) {
            return NextResponse.json({ error: 'Missing actual image.' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured on server.' }, { status: 500 });
        }

        // Build the description of the rules for the prompt
        let rulesDescription = "Here are the rules that have been defined for specific areas of the original draft. You must check the provided execution image for these specific rules.\n\n";

        rules.forEach((r: Rule, idx: number) => {
            const el = elements.find((e: CanvasElement) => e.id === r.elementId);
            if (!el) return;

            const elementType = el.type === 'text' ? 'TEXT' : (el.type === 'region' ? 'DRAWN REGION / BOX' : 'IMAGE');
            const originalText = el.text ? `Original Text: "${el.text}"` : '';
            const targetSubText = r.targetText ? `(Rule specifically targets the phrase: "${r.targetText}")` : '';

            rulesDescription += `Rule #${idx + 1} (Rule ID: ${r.id})\n`;
            rulesDescription += `- Element Type: ${elementType}, Approximate Location Box (x:${Math.round(el.x)}, y:${Math.round(el.y)}, w:${Math.round(el.w)}, h:${Math.round(el.h)})\n`;
            if (originalText) rulesDescription += `- ${originalText} ${targetSubText}\n`;

            rulesDescription += `- Rule Type: ${r.type}\n`;
            if (r.type === 'ChangeSpecific' && r.allowedKeywords) {
                rulesDescription += `- Allowed Keywords: ${r.allowedKeywords}\n`;
                rulesDescription += `  (NOTE: The original text is ALWAYS allowed to be kept. If changed, it MUST be changed to one of the Allowed Keywords.)\n`;
            }
            if (r.type === 'MustMatch' && r.expectedText) {
                rulesDescription += `- Expected Exact Text: ${r.expectedText}\n`;
            }
            if (r.type === 'InsertAllow') {
                rulesDescription += `- Prefix Allowed: ${r.prefixAllowed}, Suffix Allowed: ${r.suffixAllowed}\n`;
            }
            if (r.type === 'Other' && r.customInstruction) {
                rulesDescription += `- Custom Instruction: ${r.customInstruction}\n`;
            }
            rulesDescription += "\n";
        });

        const promptText = `
You are an expert AI advertisement inspector and compliance officer.
I am providing you with an actual execution image of an advertisement.
I am also providing you with a list of "Rules" that were designed on a virtual draft canvas. 
Please evaluate the actual execution image against these specific rules.

IMPORTANT NOTE ON COORDINATES: 
The coordinates (x, y, width, height) provided are from a rough mockup canvas editor. The actual execution image may have a different scale, alignment, or stylistic layout shift. 
Therefore, DO NOT rely strictly on the geometric coordinates. Use them ONLY as a general hint/pointer to find the corresponding text or visual element in the actual image. 
Rely primarily on the "Original Text", "Target Phrase", semantic meaning, and visual context to map the rule to the correct area in the execution image.

${rulesDescription}

Please analyze the execution image thoroughly. Determine if the visual text/image in the relevant areas complies with the rules provided.

EXPLAIN YOUR REASONING IN KOREAN. (한국어로 판정 이유를 명확하게 설명하세요. 고객에게 전달되는 리포트입니다.)

For each rule, you MUST find the EXACT bounding box of the corresponding element in the ACTUAL execution image. 
Even if the rule fails or text is missing, find where the element is or was supposed to be.
Return the bounding box as percentages (0 to 100) of the execution image's width and height.

Respond EXCLUSIVELY in the following JSON format. Start your response directly with { and end with } without formatting backticks.
{
  "matchRate": 90,
  "items": [
    {
      "ruleId": "The exact Rule ID from the prompt",
      "status": "PASS" | "FAIL" | "WARN",
      "reason": "한국어로 판정 이유 명확하게 작성",
      "boundingBox": {
        "x": 10.5,
        "y": 20.0,
        "w": 50.0,
        "h": 30.5
      }
    }
  ]
}
    `;

        // Make sure we use a model that supports vision
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const parts: any[] = [
            promptText,
            base64ToGenerativePart(actualImage)
        ];

        const result = await model.generateContent(parts);
        const responseText = result.response.text();

        const cleanContent = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

        try {
            const parsedData = JSON.parse(cleanContent);

            // Inject regions from the canvas elements back to the parsed data so the UI can draw the boxes correctly
            parsedData.items = parsedData.items.map((item: any) => {
                const matchedRule = rules.find((r: Rule) => r.id === item.ruleId);
                const matchedElement = matchedRule ? elements.find((e: CanvasElement) => e.id === matchedRule.elementId) : null;

                let region;
                if (item.boundingBox && item.boundingBox.x !== undefined) {
                    region = {
                        isPercentage: true,
                        x: item.boundingBox.x,
                        y: item.boundingBox.y,
                        w: item.boundingBox.w,
                        h: item.boundingBox.h
                    };
                } else {
                    region = matchedElement
                        ? { isPercentage: false, x: matchedElement.x, y: matchedElement.y, w: matchedElement.w, h: matchedElement.h }
                        : { isPercentage: false, x: 0, y: 0, w: 0, h: 0 };
                }

                return {
                    ...item,
                    region
                };
            });

            return NextResponse.json(parsedData);
        } catch (parseError) {
            console.error("Parse Error:", parseError, cleanContent);
            return NextResponse.json({ error: 'Failed to parse LLM response', raw: cleanContent }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Gemini Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
