import WallConfigurator from './wall-configurator'

export default async function WallPage({
  searchParams,
}: {
  searchParams: Promise<{ fotos?: string | string[]; formato?: string | string[] }>
}) {
  const params = await searchParams
  const fotos = Array.isArray(params.fotos) ? params.fotos[0] : params.fotos
  const formato = Array.isArray(params.formato) ? params.formato[0] : params.formato

  return <WallConfigurator initialPhotos={fotos} initialFormat={formato} />
}
