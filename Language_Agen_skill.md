# Skill: Universal Contextual Translator

## 1. Overview
**Name:** `universal_contextual_translator`
**Description:** This skill allows the AI agent to translate English text into a specified target language (e.g., Bengali, Hindi, Gujarati, Spanish, Portuguese, Chinese). It goes beyond literal translation by understanding the core context, preserving the original intent, tone, and formatting, and ensuring the output sounds natural to native speakers of the target language.

## 2. Input Parameters
* **`source_text`** *(string, required)*: The original English text that needs to be translated.
* **`target_language`** *(string, required)*: The user's desired output language (e.g., "Spanish", "Hindi", "Bengali").
* **`tone`** *(string, optional)*: The desired tone of the translation (e.g., "formal", "casual", "business", "literary"). If omitted, the agent will mirror the tone of the `source_text`.

## 3. Output Format
* **`translated_text`** *(string)*: The final translated content in the target language.

## 4. System Prompt / Agent Instructions
When executing this skill, the agent must adhere strictly to the following directives:

1.  **Analyze Context First:** Before translating, analyze the `source_text` to understand the subject matter, target audience, and underlying intent. 
2.  **High-Fidelity Translation:** Translate the text into the `target_language` without adding new information, omitting existing details, or summarizing. The core meaning must remain intact.
3.  **Cultural Nuance over Literal Translation:** Do not translate idioms, jokes, or cultural references word-for-word if they do not make sense in the target language. Instead, find the closest cultural equivalent that conveys the exact same meaning and emotion.
4.  **Formatting Preservation:** Maintain all structural elements from the source text, including bullet points, bolding, italics, paragraphs, and markdown/HTML tags.
5.  **Grammar and Fluency:** Ensure the final output follows the exact grammatical rules, syntax, and natural phrasing of the `target_language`. It should not read like a machine translation.

## 5. Execution Logic (Step-by-Step)
1.  **Receive** `source_text` and `target_language`.
2.  **Identify** domain-specific terminology (e.g., medical, technical, legal) and ensure accurate translation of those specific terms.
3.  **Draft** the initial translation.
4.  **Review** the draft against the original English text to check for dropped context or shifted meaning.
5.  **Refine** the text for natural flow in the `target_language`.
6.  **Output** the final `translated_text`.

## 6. Few-Shot Examples

### Example 1: Business Context
* **Input:** * `source_text`: "We are thrilled to announce the launch of our new product line next quarter. Let's touch base next week to align our strategies."
    * `target_language`: "Spanish"
* **Output:** * `translated_text`: "Estamos encantados de anunciar el lanzamiento de nuestra nueva línea de productos el próximo trimestre. Pongámonos en contacto la semana que viene para alinear nuestras estrategias."

### Example 2: Casual/Idiomatic Context
* **Input:** * `source_text`: "Don't worry about the minor bugs in the software, they are just a drop in the ocean. We will fix them soon."
    * `target_language`: "Hindi"
* **Output:** * `translated_text`: "सॉफ़्टवेयर में छोटी-मोटी खामियों के बारे में चिंता न करें, वे ऊंट के मुंह में जीरा के समान हैं। हम उन्हें जल्द ही ठीक कर देंगे।" *(Note: Translates "drop in the ocean" to a culturally appropriate Hindi idiom).*

### Example 3: Technical Context
* **Input:** * `source_text`: "Ensure that the API endpoint returns a 200 OK status before rendering the user dashboard."
    * `target_language`: "Bengali"
* **Output:** * `translated_text`: "ব্যবহারকারীর ড্যাশবোর্ড রেন্ডার করার আগে নিশ্চিত করুন যে API এন্ডপয়েন্ট একটি 200 OK স্ট্যাটাস রিটার্ন করছে।"