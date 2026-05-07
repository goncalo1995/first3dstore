import { redirect } from 'next/navigation'

export default async function CriarPage({
  searchParams,
}: {
  searchParams: Promise<{ produtoSlug?: string }>
}) {
  const params = await searchParams
  const slug = params.produtoSlug?.trim()

  if (!slug) {
    redirect('/')
  }

  redirect(`/produto/${encodeURIComponent(slug)}#configurador`)
}
