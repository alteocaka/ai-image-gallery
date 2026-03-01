# AI Service Comparison

Comparison of vision services for image analysis: tags, one-sentence description, and dominant colors.

## Requirements

- 5–10 tags, one description sentence, top 3 colors per image
- Async processing; cost-effective (free tier preferred for dev)

## Summary

| Service | Input (size) | Output | Pricing | Free tier | In this app |
|--------|--------------|--------|---------|-----------|-------------|
| **Google Gemini** | JPEG/PNG, ≤7 MB | Text → JSON via prompt | ~$0.25 / 1M in, ~$1.50 / 1M out | AI Studio quota (~1M tokens/mo) | ✅ Default |
| **OpenAI GPT-4o** | JPEG/PNG/WEBP/GIF, ≤50 MB | Text → JSON via prompt | ~$5 / 1M in, ~$15 / 1M out | $18–$100 trial credit | ✅ Alternative |
| **Anthropic Claude** | JPEG/PNG/WebP/GIF, ≤32 MB | Text → JSON via prompt | ~$3–$5 / 1M in | Small sign-up credit | ❌ |
| **Azure Computer Vision** | JPEG/PNG, ≤4–20 MB | Structured JSON (tags, caption, color hex) | ~$1 / 1K calls | 5,000 calls/mo | ❌ |
| **AWS Rekognition** | JPEG/PNG, ≤15 MB | Labels + dominant colors (no caption) | ~$0.001/image | 1K images/mo, 12 mo | ❌ |

LLM options (Gemini, OpenAI, Claude) need a single prompt to return tags, description, and colors as JSON; none return color hex natively. Azure returns ready-made JSON including `accentColor` hex; AWS gives labels and colors but no caption.

## Monthly cost (example)

Assumption: **tokens per image** = total input + output for one analysis (e.g. ~500 tokens). Costs below are **per month** for that volume.

| Images/month | Tokens/image | Approx. monthly cost (Gemini) | Approx. monthly cost (GPT-4o) |
|--------------|--------------|--------------------------------|-------------------------------|
| 1,000 | ~500 | ~$0.13 | ~$0.25–0.50 |

Both providers’ free tiers cover light use and initial development.

## Options in brief

- **Gemini:** Strong quality, good free tier, easy REST/SDK. No native color hex (prompt for it).
- **GPT-4o:** Top caption quality, flexible JSON via prompt. Low-detail ~$0.001–0.002/image. Good trial credit.
- **Claude:** Strong vision, higher per-image cost, modest free tier.
- **Azure CV:** One-call structured JSON with tags, caption, and color hex. Cheaper; captions more generic.
- **AWS Rekognition:** Labels and dominant colors only; no caption (would need another service).

## Chosen in this app

**Google Gemini** (default) and **OpenAI GPT-4o**, selected in the profile menu; choice stored in localStorage. The server uses a pluggable AI factory so both use the same interface (tags, description, colors).

**Why these:** Gemini’s free tier and token pricing suit dev and low-volume use; GPT-4o adds a strong alternative and trial credit. Both support one-prompt JSON output. Azure was considered for native color hex and low cost but captions are less rich; we prioritized description quality and a single prompt flow across providers.

## Trade-offs

- **Quality vs cost:** LLMs give richer captions than Azure/AWS but cost more per image (tokens vs per-call).
- **Vendor flexibility:** Supporting Gemini + OpenAI avoids lock-in; factory pattern makes adding providers easy.
- **Rate limits:** LLMs have token/request limits; vision APIs allow higher TPS. Fine for typical gallery uploads.
- **Convenience:** Vision APIs return ready JSON (Azure includes hex); LLMs need prompt + parsing but one prompt covers tags, description, and colors.

## References

- [Gemini: image understanding](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-understanding) · [pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [OpenAI: images and vision](https://developers.openai.com/api/docs/guides/images-vision/) · [pricing](https://developers.openai.com/api/docs/pricing/) · [rate limits](https://developers.openai.com/api/docs/guides/rate-limits/)
- [Claude: vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Azure Computer Vision: FAQ](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/faq) · [descriptions](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/concept-describing-images) · [color](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/concept-detecting-color-schemes)
- [AWS Rekognition pricing](https://aws.amazon.com/rekognition/pricing/)
