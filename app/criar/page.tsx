import { redirect } from 'next/navigation'

export default async function CriarPage({
  searchParams,
}: {
  searchParams: Promise<{ produtoSlug?: string | string[] }>
}) {
  const params = await searchParams
  const produtoSlug = params.produtoSlug
  const slug = Array.isArray(produtoSlug) ? produtoSlug[0]?.trim() : produtoSlug?.trim()

  if (!slug) {
    redirect('/')
  }

  redirect(`/produto/${encodeURIComponent(slug)}#configurador`)
}
