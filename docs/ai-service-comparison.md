# AI Service Comparison

Comparison of AI vision services for image analysis (tags, description, dominant colors).

## Requirements

- Generate 5–10 relevant tags per image
- One descriptive sentence per image
- Extract dominant colors (top 3)
- Async/background processing
- Cost-effective (free tier preferred for dev)

---

## Option 1: Google Gemini (Vertex AI / AI Studio)

**Input:** JPEG/PNG (base64 or GCS URL), up to 7 MB per image. Models: Gemini 2.5 Flash, Gemini 2.5 Flash Lite, etc.

**Output:** Returns text; can generate JSON via structured output or prompting (e.g. prompts instructing JSON with tags, description, colors). Natively returns labels/captions in text; no direct color hex output (requires asking the model to infer and output hex).

**Pricing:** Token-based. Gemini 2.5 Flash: ~\$0.25 per 1M input tokens, ~\$1.50 per 1M output (text). Gemini Pro Vision: ~\$2.00/\$12.00 per 1M tokens. No per-image fee. Free tier: AI Studio grants limited quota (~1M tokens/month).

**Rate limits:** Free tier limited. Paid: high token quotas (e.g. Gemini 2.0 Flash: 40M tokens/min in US). Vertex AI quotas scale with usage; detailed limits in GCP console.

**Pros:**

- Good free tier for development and experimentation
- Strong image understanding
- Easy integration via REST or Google SDK
- Flexible prompting for custom JSON output

**Cons:**

- No native color hex output; model must be prompted to infer colors
- Token-based pricing can add up at scale
- Some model versions (e.g. 2.0 Flash) deprecated for new users

**Sources:** [Image understanding | Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-understanding), [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

---

## Option 2: OpenAI GPT-4 Vision / GPT-4o

**Input:** JPEG/PNG/WEBP/GIF (upload via file API or URL). File upload up to ~50 MB payload per request. Use `image_url` in chat completion or upload file and pass `file_id`. Purpose `vision` supported.

**Output:** Returns text. By default produces a caption/analysis in plain text; can be prompted to emit JSON structure (tags, description, colors). No built-in color extraction; model can list colors in hex when instructed.

**Pricing:** Token-based. GPT-4o: ~\$5.00 input, \$15.00 output per 1M tokens. GPT-4-vision (v1106): ~\$10/\$30 per 1M. Low-detail image (~85 tokens) costs ≈\$0.001–0.002 per query. Free tier: \$18 credit (new users) and \$100 credit over first 3 months; thereafter pay-as-you-go.

**Rate limits:** Free: \$100/month soft limit on usage credits. Paid: tiers up to 100 requests/min (model-dependent). GPT-4 rates ~20 req/min and 3.5M tokens/min per org at Tier 1.

**Pros:**

- Top-tier image understanding and captioning quality
- Flexible prompting; can output exact JSON structure needed
- Competitive token pricing (~\$0.001–0.002 per image in low-detail mode)
- Generous free trial credit for evaluation
- Straightforward integration via REST or Node SDK

**Cons:**

- No native color hex output; requires prompt engineering
- Rate limits can be stricter under high load

**Sources:** [Images and vision | OpenAI API](https://developers.openai.com/api/docs/guides/images-vision/), [OpenAI pricing](https://developers.openai.com/api/docs/pricing/), [OpenAI rate limits](https://developers.openai.com/api/docs/guides/rate-limits/)

---

## Option 3: Anthropic Claude (Vision)

**Input:** JPEG/PNG/WebP/GIF (base64 or URL). API accepts images inline, up to 32 MB total per request. Supports up to 100 images per request (typically one is recommended).

**Output:** Returns text. Can be prompted to output JSON (e.g. via system prompt). No built-in color extraction; model can describe colors but not natively output hex.

**Pricing:** Token-based. Claude Sonnet 4.6: ~\$3 per 1M input tokens, \$15 per 1M output. Claude Opus 4.6: \$5/\$25 per M. Images count as input tokens (~1K–2K per image ⇒ ~\$0.003–\$0.008 each). Free tier: limited (Anthropic often offers \$5–\$18 sign-up credit).

**Rate limits:** Default quotas modest; can be raised. Some report ~20 req/min for Free tier.

**Pros:**

- Strong vision capabilities
- Flexible prompting for JSON output

**Cons:**

- No native color hex; requires prompting
- Higher per-image cost than Gemini/OpenAI
- Modest free tier

**Sources:** [Vision - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/vision)

---

## Option 4: Azure Computer Vision (AI Services)

**Input:** JPEG/PNG (binary or URL). Up to 4 MB on v3.2 (free tier) or 20 MB on v4.0.

**Output:** **Structured JSON** with tags (list of labels), description (captions), and color info including `accentColor` hex and dominant color names (e.g. `"accentColor": "BB6D10"`).

**Pricing:** Transaction-based. S1 tier: ~\$1 per 1,000 transactions for basic features. Free tier: 5,000 free calls/month.

**Rate limits:** Free S0: 20 calls/min. Paid S1: 10 calls/sec (can be raised via support).

**Pros:**

- Native structured output (tags, description, colors) in one call
- No prompt engineering needed for JSON
- Low cost per image
- Built-in color hex output

**Cons:**

- Captions tend to be more generic than LLM-based models
- Less flexible for custom output shapes

**Sources:** [Azure Computer Vision FAQ](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/faq), [Image descriptions](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/concept-describing-images), [Color scheme detection](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/concept-detecting-color-schemes)

---

## Option 5: AWS Rekognition (Image)

**Input:** JPEG/PNG (bytes or S3 reference). No public size limit; subject to AWS 15 MB payload. Supports PNG/GIF.

**Output:** Structured JSON. Can detect labels (tags) and optionally image properties. Labels include names and confidence. ImageProperties returns DominantColors (names, percentages) and DominantColorForeground/Background. No caption output (would need a custom model).

**Pricing:** Tiered per image. DetectLabels (Group2): first 1M images \$0.001 each (0.1¢), then \$0.0008. ImageProperties: \$0.00075 per image (first 1M). Free: 1,000 images/month for 12 months.

**Rate limits:** Default quotas moderate (per-region, per-account; ~5–10 requests/sec initially; can request raises via Service Quotas).

**Pros:**

- Native labels and dominant color extraction
- Low per-image cost

**Cons:**

- No caption generation; would need separate solution for descriptions
- AWS-specific integration (S3, SDK)

**Sources:** [Amazon Rekognition pricing](https://aws.amazon.com/rekognition/pricing/)

---

## Chosen Services

**Implementation:** This app supports **Google Gemini** and **OpenAI (GPT-4o)** via a pluggable AI factory. Users select provider and model in the profile menu; preferences are stored in localStorage.

**Primary choice (default):** Google Gemini 2.5 Flash / 2.5 Flash Lite.

**Justification:**

- **Cost:** Gemini’s free tier (AI Studio) is generous for development and low-volume use; token pricing remains competitive at scale.
- **Quality:** Both Gemini and GPT-4o produce natural, detailed descriptions and relevant tags when prompted.
- **Flexibility:** LLM-based vision allows a single prompt to output tags, description, and colors in JSON format; the same interface works for both providers.
- **OpenAI as alternative:** GPT-4o is included for users who prefer it or hit Gemini quota limits. It offers excellent caption quality and a solid free trial for evaluation.
- **Azure considered but not implemented:** While Azure Computer Vision natively returns tags, captions, and color hex, its captions are often more generic. LLMs provide richer, more varied descriptions, and the prompt-based approach keeps the implementation simple across multiple providers.

---

## Trade-offs & Cost Notes

**Quality vs cost:** LLM-based vision (Gemini, GPT-4o, Claude) yields more natural and detailed descriptions than traditional vision APIs (Azure, AWS Rekognition), but costs more per image (token pricing vs per-call). Azure/AWS are cheaper per image but may produce less rich captions.

**Vendor lock-in & flexibility:** Supporting both Gemini and OpenAI avoids single-vendor dependency. Users can switch if one provider hits quota or has pricing changes. The factory pattern makes adding more providers straightforward.

**Rate limits vs throughput:** Cloud LLM APIs may have stricter rate limits (tokens/min or requests/min). Vision APIs (Azure/AWS) allow higher TPS and lower per-request latency for bulk processing. For typical gallery usage (upload a few images at a time), LLM rate limits are sufficient.

**Developer convenience:** Vision APIs return ready-structured data; Azure even gives color hex codes. LLM APIs require prompt design and JSON parsing, but allow more nuanced, open-ended outputs and a single prompt for tags, description, and colors.

**Cost awareness:** For ~1,000 images/month at ~500 tokens/image: Gemini ~\$0.13, GPT-4o ~\$0.25–0.50. Both free tiers cover initial development and light production use.
