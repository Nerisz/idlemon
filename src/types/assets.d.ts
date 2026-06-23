/**
 * Declarações de módulos para assets estáticos importados via Metro.
 *
 * O Metro resolve `require("...png")` para um identificador numérico de asset
 * (o "module id"). Tipar como `number` mantém o strict mode satisfeito e é
 * exatamente o que o `useImage` do Skia aceita como fonte de dados local.
 */
declare module "*.png" {
  const asset: number;
  export default asset;
}

declare module "*.jpg" {
  const asset: number;
  export default asset;
}

declare module "*.webp" {
  const asset: number;
  export default asset;
}
