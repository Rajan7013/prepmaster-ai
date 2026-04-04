import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.warn("Gemini API Key is not set. Please check your environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export const parseResume = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Extract the following details from this resume text: personal details, degree, projects, skills, certificates. Return as JSON.
      
      Resume Text:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personalDetails: { type: Type.OBJECT },
            degree: { type: Type.ARRAY, items: { type: Type.STRING } },
            projects: { type: Type.ARRAY, items: { type: Type.STRING } },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            certificates: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (err: any) {
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("You have exceeded your Gemini API quota. Please check your plan and billing details.");
    }
    throw err;
  }
};

export const generateInterviewQuestions = async (
  resumeData: any, 
  role: string, 
  industry: string, 
  difficulty: 'Basic' | 'Intermediate' | 'Advanced' = 'Intermediate',
  topics: string[] = [],
  isQuizMode: boolean = false
) => {
  try {
    const topicStr = topics.length > 0 ? `Focus on these topics: ${topics.join(', ')}.` : '';
    const difficultyStr = `The difficulty level is ${difficulty}. ${
      difficulty === 'Basic' ? 'Start with easy, introductory questions and basic definitions.' :
      difficulty === 'Intermediate' ? 'Ask a mix of conceptual and practical questions.' :
      'Ask complex, in-depth, and challenging technical questions.'
    }`;
    
    const quizInstruction = isQuizMode 
      ? 'Return each question as an object with: "question", "options" (array of 3 choices: A, B, C), and "correctAnswer" (A, B, or C).'
      : 'Return each question as a simple string.';

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Based on this resume data and the target role (${role}) in ${industry}, generate 5 relevant interview questions.
      ${difficultyStr}
      ${topicStr}
      ${quizInstruction}
      
      Resume Data: ${JSON.stringify(resumeData)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: isQuizMode ? {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer"]
          }
        } : {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (err: any) {
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("You have exceeded your Gemini API quota. Please check your plan and billing details.");
    }
    throw err;
  }
};

export const evaluatePractice = async (audioBase64: string, mode: string, promptText: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        { text: `Evaluate the following audio recording for a ${mode} practice session.
        The user was supposed to ${mode === 'reading' ? 'read this text aloud' : 'speak on this topic'}: "${promptText}".
        
        Analyze their pronunciation, fluency, pace, and clarity.
        Provide a score from 0 to 100, and a brief, constructive feedback paragraph.` },
        { inlineData: { data: audioBase64, mimeType: 'audio/webm' } }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (err: any) {
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("You have exceeded your Gemini API quota. Please check your plan and billing details.");
    }
    throw err;
  }
};

export const analyzePerformance = async (sessionData: any, videoBase64?: string) => {
  const parts: any[] = [
    { text: `Analyze this interview session data and the provided video recording (if any). 
    Specifically, detect and quantify instances of stuttering and fumbling in the audio/video. 
    Provide specific feedback on instances and frequency. 
    Adjust the 'overallScore' and 'metrics.fumbling'/'metrics.stuttering' accordingly based on the video analysis.
    
    Session Data: ${JSON.stringify(sessionData)}` }
  ];

  if (videoBase64) {
    parts.push({
      inlineData: {
        data: videoBase64,
        mimeType: 'video/webm'
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            metrics: { 
              type: Type.OBJECT,
              properties: {
                fumbling: { type: Type.NUMBER, description: "Score from 0-100 (100 being no fumbling)" },
                stuttering: { type: Type.NUMBER, description: "Score from 0-100 (100 being no stuttering)" },
                subjectKnowledge: { type: Type.NUMBER },
                vocabulary: { type: Type.NUMBER },
                communication: { type: Type.NUMBER },
                eyeMovement: { type: Type.NUMBER },
                gestures: { type: Type.NUMBER },
                voicePitch: { type: Type.NUMBER },
                responseTime: { type: Type.NUMBER }
              }
            },
            feedback: { 
              type: Type.OBJECT,
              properties: {
                voice: { type: Type.STRING },
                gestures: { type: Type.STRING },
                content: { type: Type.STRING },
                stutteringAndFumbling: { type: Type.STRING, description: "Specific feedback on instances and frequency of stuttering and fumbling" }
              }
            },
            positiveQuote: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (err: any) {
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("You have exceeded your Gemini API quota. Please check your plan and billing details.");
    }
    throw err;
  }
};
