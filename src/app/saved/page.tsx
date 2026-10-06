import { allArticles } from "@/data/articles";
import { toArticleSummary } from "@/lib/article-summary";
import { SavedArticlesView } from "./saved-view";

export default function SavedPage() {
  // Send only card metadata across the server/client boundary. The source
  // catalog also contains article bodies, which must remain on the server.
  const articles = allArticles.map(toArticleSummary);
  return <SavedArticlesView articles={articles} />;
}
