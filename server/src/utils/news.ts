export function parseSimpleRss(xml: string, sourceName: string) {
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    const descriptionRegex = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/;

    function decodeXmlEntities(value: string): string {
        const entities: Record<string, string> = {
            amp: "&",
            lt: "<",
            gt: ">",
            quot: '"',
            apos: "'",
            "#39": "'",
            nbsp: " ",
        };
        return value.replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/gi, (_, entity: string) => entities[entity.toLowerCase()] || " ");
    }

    function cleanRssText(value: string): string {
        let text = decodeXmlEntities(value);
        text = text.replace(/<[^>]*>/g, " ");
        text = decodeXmlEntities(text);
        return text.replace(/&[a-z0-9#]+;/gi, " ").replace(/\s+/g, " ").trim();
    }

    function parsePublishedAt(value?: string): string | null {
        if (!value) return null;
        const timestamp = Date.parse(value);
        return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
    }

    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1] || "";
        const titleMatch = titleRegex.exec(itemXml);
        const linkMatch = linkRegex.exec(itemXml);
        const pubDateMatch = pubDateRegex.exec(itemXml);
        const descriptionMatch = descriptionRegex.exec(itemXml);

        if (titleMatch || linkMatch) {
            const rawTitle = titleMatch ? cleanRssText(titleMatch[1]) : "No Title";
            let rawDesc = descriptionMatch?.[1]
                ? cleanRssText(descriptionMatch[1])
                : null;

            // Extract true publisher if Google News provides "Title - Publisher"
            let title = rawTitle;
            let source = sourceName;
            if (sourceName === "Google News" && rawTitle.includes(" - ")) {
                const parts = rawTitle.split(" - ");
                const possibleSource = parts.pop()?.trim();
                if (possibleSource && possibleSource.length < 50) {
                    source = possibleSource;
                    title = parts.join(" - ").trim();
                }
            }

            // Google News RSS description is only the headline anchor and publisher font tag.
            // If the description just repeats the headline/source, discard it.
            if (rawDesc) {
                const normDesc = rawDesc.toLowerCase().replace(/[^a-z0-9]/g, "");
                const normTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (!normDesc || normDesc === normTitle || normDesc.startsWith(normTitle) || normTitle.startsWith(normDesc)) {
                    rawDesc = null;
                }
            }

            items.push({
                title,
                url: linkMatch ? decodeXmlEntities(linkMatch[1]).trim() : "",
                publishedAt: parsePublishedAt(pubDateMatch?.[1]),
                description: rawDesc,
                content: rawDesc,
                source
            });
        }
    }
    return {
        totalResults: items.length,
        articles: items
    };
}