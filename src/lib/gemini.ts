import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

export async function generateTagsAndTitle(designDescription: string): Promise<{ title: string; tags: string[] }> {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `You are an expert Print-on-Demand SEO specialist for Redbubble and YouCan. Given the design description below, generate an engaging title and a list of high-ranking, relevant tags suitable for selling this design online. 
      Respond in pure JSON matching this schema: { "title": "string", "tags": ["string"] }. Do not wrap in markdown blocks.
      Design Description: ${designDescription}`,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (error) {
    console.error("AI Error:", error);
  }
  return { title: "", tags: [] };
}

export async function getOrderAdvice(orderData: any): Promise<string> {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `You are an expert sales analyst for a luxury streetwear brand. Analyze this order and provide one paragraph of business advice (like upselling, trending colors based on location, etc.).
      Order Details: ${JSON.stringify(orderData)}`
    });

    return response.text || "No advice available.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Error generating advice.";
  }
}

export async function critiqueDesign(fileDataUrl: string): Promise<string> {
  try {
    const base64Data = fileDataUrl.split(',')[1];
    const mimeType = fileDataUrl.substring(5, fileDataUrl.indexOf(';'));
    
    const response = await getAI().models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        "Critique this design from the perspective of a consumer living in the USA looking for premium luxury streetwear. What works? What doesn't? What demographics would buy it?"
      ]
    });
    return response.text || "No critique generated.";
  } catch(error) {
    console.error("AI Error:", error);
    return "Error getting critique.";
  }
}
