export const brand = {
  name: "DecantsCBA",
  displayName: "Decants.CBA",
  shortName: "DC",
  tagline: "Decants originales de tus perfumes favoritos",
  description: "Decants originales de tus perfumes favoritos, con stock visible y envíos a todo el país.",
  whatsapp: "3516802358",
  email: "franciscogo005@gmail.com",
  location: "Córdoba",
  instagram: "@decants.cba",
  instagramUrl: "https://www.instagram.com/decants.cba/",
  logoUrl: "https://d22fxaf9t8d39k.cloudfront.net/e1e756c5d656dece19e4c4e23a31467d770fb41cffc07f8cf952ff1e10721ad1389501.png",
};

export function whatsappUrl(message = "Hola DecantsCBA, quiero consultar por un pedido.") {
  return `https://wa.me/549${brand.whatsapp}?text=${encodeURIComponent(message)}`;
}
