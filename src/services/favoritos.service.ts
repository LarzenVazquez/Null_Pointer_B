import { prisma } from "../lib/prisma";

export async function getFavoritos(usuarioId: number): Promise<string[]> {
  const favoritos = await prisma.favorito.findMany({
    where: { usuarioId },
    select: { salaId: true },
  });
  return favoritos.map((f) => f.salaId);
}

export async function toggleFavorito(usuarioId: number, salaId: string): Promise<string[]> {
  const existente = await prisma.favorito.findUnique({
    where: { usuarioId_salaId: { usuarioId, salaId } },
  });

  if (existente) {
    await prisma.favorito.delete({
      where: { usuarioId_salaId: { usuarioId, salaId } },
    });
  } else {
    await prisma.favorito.create({ data: { usuarioId, salaId } });
  }

  return getFavoritos(usuarioId);
}
