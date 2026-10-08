import { Badge, Button, Card } from "@repo/ui";

const SAMPLE_USERS = [
  {
    id: "1",
    name: "Shakil Ahmed",
    email: "shakil@firstcup.tech",
    role: "admin",
    plan: "PRO",
    banned: false,
  },
  {
    id: "2",
    name: "Sarah Jenkins",
    email: "sarah@techcorp.io",
    role: "user",
    plan: "PRO",
    banned: false,
  },
  {
    id: "3",
    name: "David Kim",
    email: "dkim@startup.dev",
    role: "user",
    plan: "FREE",
    banned: false,
  },
  {
    id: "4",
    name: "Spam Bot",
    email: "bot992@spammer.net",
    role: "user",
    plan: "FREE",
    banned: true,
  },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Directory of registered accounts, subscription plans, and administrative bans.
        </p>
      </div>

      <Card className="overflow-hidden border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase border-b border-border/40">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {SAMPLE_USERS.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="p-4">
                    <Badge variant={user.role === "admin" ? "success" : "outline"}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge variant={user.plan === "PRO" ? "success" : "secondary"}>
                      {user.plan}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {user.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <span className="text-xs text-emerald-400 font-medium">Active</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant={user.banned ? "outline" : "ghost"}
                      size="sm"
                      className="text-xs"
                    >
                      {user.banned ? "Unban" : "Ban"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
