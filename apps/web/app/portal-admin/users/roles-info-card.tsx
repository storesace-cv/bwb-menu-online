import { Card } from "@/components/admin";

export type RoleInfo = { code: string; name: string; description: string };

export function RolesInfoCard({ roles }: { roles: RoleInfo[] }) {
  return (
    <Card>
      <h2 className="text-lg font-medium text-slate-200 mb-3">Perfis disponíveis</h2>
      <p className="text-slate-400 text-sm mb-4">
        Cada utilizador tem um perfil (role) que define o que pode fazer no portal.
      </p>
      <ul className="space-y-3">
        {roles.map((r) => (
          <li key={r.code} className="border-l-2 border-emerald-600/50 pl-3 py-1">
            <span className="font-medium text-slate-200">{r.name}</span>
            <p className="text-slate-400 text-sm mt-0.5">{r.description}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
