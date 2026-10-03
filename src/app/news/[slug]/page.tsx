import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NEWS, formatDate, getArticle, relatedArticles } from "@/data/news";
import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { ShareControl } from "@/components/sections/ShareControl";
import { CtaBanner } from "@/components/sections/CtaBanner";

export function generateStaticParams() {
  return NEWS.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Yangilik topilmadi" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: { title: article.title, description: article.excerpt, images: [{ url: article.image }] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const related = relatedArticles(article.slug, 2);

  return (
    <>
      <article>
        {/* header */}
        <header className="relative overflow-hidden bg-[color:var(--bg-2)] pb-40 pt-[130px] sm:pt-[150px]">
          <div className="container-x relative">
            <nav aria-label="Sahifa yo‘nalishi" className="crumbs mb-8">
              <Link href="/">Bosh sahifa</Link>
              <span className="flex items-center gap-2.5">
                <span aria-hidden="true" className="opacity-50">/</span>
                <Link href="/news">Yangiliklar</Link>
              </span>
              <span className="flex items-center gap-2.5">
                <span aria-hidden="true" className="opacity-50">/</span>
                <span aria-current="page" className="max-w-[40ch] truncate text-white">{article.title}</span>
              </span>
            </nav>
            <div className="flex flex-wrap items-center gap-3">
              <span className="tag tag-dark">{article.category}</span>
              <time dateTime={article.date} className="text-[0.85rem] font-bold text-white/75">
                {formatDate(article.date)}
              </time>
              <span className="text-[0.85rem] font-bold text-white/50">• {article.readingTime} o‘qish</span>
            </div>
            <h1 className="mt-5 max-w-[22ch] font-display text-[clamp(1.9rem,1.2rem + 3.6vw,3.4rem)] font-extrabold leading-[1.12] tracking-tight text-white">
              {article.title}
            </h1>
          </div>
        </header>

        {/* hero image overlapping */}
        <div className="container-x relative -mt-32">
          <Reveal variant="img" className="img-frame shimmer aspect-[16/8] min-h-[260px] shadow-2xl">
            <Image
              src={article.image}
              alt={article.alt}
              fill
              priority
              sizes="(min-width: 1240px) 1200px, 92vw"
              className="object-cover"
            />
          </Reveal>
        </div>

        {/* body */}
        <div className="container-x grid gap-12 py-14 lg:grid-cols-[1fr_minmax(0,680px)_1fr]">
          <aside className="order-2 lg:order-1">
            <div className="sticky top-28 flex flex-row gap-3 lg:flex-col">
              <ShareControl title={article.title} slug={article.slug} />
              <Link href="/news" className="icon-btn" aria-label="Barcha yangiliklarga qaytish" title="Yangiliklarga qaytish">
                <Icon name="arrow-left" size={19} />
              </Link>
            </div>
          </aside>

          <div className="order-1 lg:order-2">
            <Reveal>
              <div className="article-body">
                <p className="!text-[1.12rem] !leading-relaxed !text-ink">
                  <b>{article.excerpt}</b>
                </p>
                {article.body.map((block, i) => {
                  if (block.type === "h") return <h2 key={i} className="!mt-4 h3">{block.text}</h2>;
                  if (block.type === "quote") return <blockquote key={i}>{block.text}</blockquote>;
                  return <p key={i}>{block.text}</p>;
                })}
              </div>
            </Reveal>

            <Reveal className="mt-10">
              <div className="n-flat flex flex-wrap items-center gap-4 p-5">
                <span className="proto-note">
                  <Icon name="alert" size={15} />
                  Prototip maqola — haqiqiy kontent Phase-3 (ma’lumotlar bazasi)dan keladi
                </span>
              </div>
            </Reveal>
          </div>
        </div>

        {/* related */}
        <section data-ambient="/images/news-olympiad.jpg" className="band section-pad-tight" aria-label="O'xshash maqolalar">
          <div className="container-x">
            <Reveal variant="fade">
              <h2 className="h3 mb-8">O‘xshash maqolalar</h2>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2">
              {related.map((n) => (
                <Reveal key={n.slug}>
                  <Link href={`/news/${n.slug}`} className="n n-card group flex items-stretch overflow-hidden" aria-label={n.title}>
                    <span className="img-frame img-zoom shimmer relative !rounded-none w-[130px] flex-none">
                      <Image src={n.image} alt={n.alt} fill sizes="130px" className="object-cover" />
                    </span>
                    <span className="flex flex-1 flex-col justify-center gap-1.5 p-5">
                      <span className="flex items-center gap-2.5">
                        <span className="tag">{n.category}</span>
                        <time dateTime={n.date} className="text-[0.76rem] font-bold text-faint">
                          {formatDate(n.date)}
                        </time>
                      </span>
                      <span className="font-display text-[1rem] font-extrabold leading-snug tracking-tight transition-colors group-hover:text-[color:var(--accent-ink)]">
                        {n.title}
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </article>

      <CtaBanner />
    </>
  );
}
