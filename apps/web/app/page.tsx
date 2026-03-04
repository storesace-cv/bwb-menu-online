import { headers } from "next/headers";
import { getPublicMenuByHostname } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get("host") ?? headersList.get("x-forwarded-host") ?? "";

  const menu = await getPublicMenuByHostname(host);

  if (menu.error) {
    return (
      <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
        <h1>BWB Menu Online</h1>
        <p>Nenhuma loja encontrada para este endereço.</p>
        <p className="text-sm text-gray-500">{menu.error}</p>
      </main>
    );
  }

  if (!menu.store_id || !menu.categories?.length) {
    return (
      <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
        <h1>BWB Menu Online</h1>
        <p>Menu em construção.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Menu</h1>
      {menu.categories.map((cat) => (
        <section key={cat.id} style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            {cat.name}
          </h2>
          {cat.description && (
            <p style={{ color: "#666", marginBottom: "0.75rem" }}>
              {cat.description}
            </p>
          )}
          <ul style={{ listStyle: "none", padding: 0 }}>
            {cat.items?.map((item) => (
              <li
                key={item.id}
                style={{
                  borderBottom: "1px solid #eee",
                  padding: "0.75rem 0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <span>
                    {item.menu_name}
                    {item.is_featured && (
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#c00" }}>
                        Destaque
                      </span>
                    )}
                  </span>
                  {item.menu_price != null && (
                    <span>{Number(item.menu_price).toFixed(2)} €</span>
                  )}
                </div>
                {item.menu_description && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "#555" }}>
                    {item.menu_description}
                  </p>
                )}
                {item.allergens?.length > 0 && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#888" }}>
                    Alergénios: {item.allergens.map((a) => a.code).join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
