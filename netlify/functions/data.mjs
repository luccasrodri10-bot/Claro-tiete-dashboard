import { getStore } from "@netlify/blobs";

const STORE = "tiete-dashboard";
const KEY = "state";

function storeName() {
  return process.env.CONTEXT === "production" ? STORE : `${STORE}-preview`;
}

function emptyState() {
  return {
    dados: [],
    metasMensais: {},
    equipe: ["Alex","Bruno","Patrick","Diego","Glaucia","João","Matheus","Erick","Giulia","Italo","Guilherme"]
      .map(nome => ({ nome, ativo: true })),
    metasIndividuais: {}
  };
}

export default async (req) => {
  const store = getStore({
    name: storeName(),
    consistency: "strong"
  });

  if (req.method === "GET") {
    const state = await store.get(KEY, { type: "json" });
    return Response.json({ state: state || null });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "JSON inválido" },
      { status: 400 }
    );
  }

  const current =
    (await store.get(KEY, { type: "json" })) ||
    emptyState();

  let next = { ...current };

  if (body.action === "launch" && body.payload?.launch) {
    const x = body.payload.launch;
    const dados = Array.isArray(current.dados)
      ? [...current.dados]
      : [];

    const filtered = dados.filter(
      y => !(y.data === x.data && y.vendedor === x.vendedor)
    );

    filtered.push(x);
    next.dados = filtered;

  } else if (
    body.action === "metas" &&
    body.payload?.metasMensais
  ) {
    next.metasMensais = body.payload.metasMensais;

  } else if (
    body.action === "team" &&
    body.payload
  ) {
    if (Array.isArray(body.payload.equipe)) {
      next.equipe = body.payload.equipe;
    }

    if (
      body.payload.metasIndividuais &&
      typeof body.payload.metasIndividuais === "object"
    ) {
      next.metasIndividuais =
        body.payload.metasIndividuais;
    }

  } else if (
    body.action === "state" &&
    body.payload
  ) {
    next = body.payload;

  } else {
    return Response.json(
      { error: "Ação inválida" },
      { status: 400 }
    );
  }

  next.updatedAt = new Date().toISOString();

  await store.setJSON(KEY, next);

  return Response.json({
    ok: true,
    state: next
  });
};
