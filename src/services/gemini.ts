import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is required");
}

const ai = new GoogleGenAI({ apiKey });

export const parseResume = async (text: string) => {
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
};

export const generateInterviewQuestions = async (resumeData: any, role: string, industry: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Based on this resume data and the target role (${role}) in ${industry}, generate 5 relevant interview questions.
    
    Resume Data: ${JSON.stringify(resumeData)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  return JSON.parse(response.text || "[]");
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
};
