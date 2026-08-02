# FEATURE RECOMMENDATIONS & PRODUCT STRATEGY — STREAMFLICKER

This document provides 15 specific, high-impact feature recommendations for StreamFlicker, evaluated for user value, business impact, technical effort, and implementation priority.

---

| Priority | Feature Name | Problem Solved | User Value | Business Value | Effort | Risk | Dependencies | Status | Reasoning |
|---|---|---|---|---|---|---|---|---|---|
| **P0** | **Cloud Watchlist Synchronization** | Watchlist currently resets if browser local storage is cleared. | High | Medium | Low | Low | Supabase DB | Recommended | Users want their bookmarked movies available across mobile and desktop. |
| **P0** | **Automated Price Drop Email Alerts** | Users cannot currently receive email alerts when prices drop. | High | High | Medium | Low | Resend / SendGrid | Recommended | High conversion driver for affiliate rentals ($3.99 -> $1.99). |
| **P1** | **"Where to Stream" JustWatch API Integration** | Stream availability changes dynamically across regions. | High | High | Medium | Low | JustWatch API | Recommended | Ensures 100% real-time accuracy for regional streaming links. |
| **P1** | **Social Trailer Sharing & Preview Cards** | Sharing a movie link should generate a rich OpenGraph video card on Twitter/Discord. | High | High | Low | Low | OpenGraph / Vercel OG | Recommended | Virality driver for social sharing of horror/sci-fi trailers. |
| **P1** | **Group Movie Night Voting Room** | Friends struggle to decide on a movie to watch together. | High | High | Medium | Low | WebSockets / Supabase Realtime | Recommended | Excellent engagement feature for movie night groups. |
| **P1** | **PWA Offline & Instant Desktop App** | Mobile users want an app-like icon on iOS/Android home screens. | High | Medium | Low | Low | Vite PWA Plugin | Recommended | Increases user retention and repeat visits. |
| **P2** | **AI Movie Recommendation Chatbot** | "Find me a psychological thriller like Shutter Island on Netflix". | High | High | Medium | Low | Gemini API / OpenAI API | Recommended | Great discovery tool for natural language prompts. |
| **P2** | **Rotten Tomatoes & Letterboxd Rating Integration** | Users want to compare IMDb ratings with Critic Consensus. | Medium | Medium | Low | Low | OMDb API | Recommended | Adds extra trust signals for film buffs. |
| **P2** | **Custom User Lists & Curation** | Users want to create lists like "My Top 10 Halloween Movies". | High | Medium | Medium | Low | Supabase DB | Recommended | User-generated content drives long-tail traffic. |
| **P2** | **Trailer Speed & Subtitle Controls** | Accessibility for deaf/hard-of-hearing users or fast previewing. | Medium | Low | Low | Low | YouTube Player API | Recommended | Enhances accessibility and power user UX. |
| **P2** | **Streaming Subscription Price Calculator** | Users want to know how much they spend on streaming services monthly. | Medium | Medium | Low | Low | Local State | Recommended | High engagement tool for budget-conscious viewers. |
| **P3** | **Watch History & Analytics Dashboard** | Users forget what movies they already watched. | Medium | Low | Low | Low | Local Storage | Future Idea | Helpful for personal tracking. |
| **P3** | **Community Movie Reviews & Ratings** | Users want to leave quick 1-sentence reviews. | Medium | Medium | Medium | Medium | Supabase DB | Future Idea | Moderation required. |
| **P3** | **Dark / OLED Black Theme Toggle** | Save battery life on mobile OLED screens. | Low | Low | Low | Low | Tailwind CSS | Future Idea | Nice aesthetic enhancement. |
| **Reject** | **Third-Party Ad Banners** | Display ads ruin the sleek Netflix-style aesthetic. | Low | Negative | Low | High | AdSense | Rejected | Affiliates generate far higher RPM without clunky banner ads. |

---

## Strategic Product Summary
StreamFlicker's competitive advantage is **lightning-fast micro-genre discovery + instant 1-click trailer playback**. Prioritizing P0 & P1 features (Cloud Watchlists, Price Drop Emails, and PWA Installation) will maximize user retention and affiliate revenue.
