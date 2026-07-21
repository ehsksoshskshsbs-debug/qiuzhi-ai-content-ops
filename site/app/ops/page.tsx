import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { getOpsAccess } from "../ops-auth";
import OpsWorkbench from "./workbench";
import Link from "next/link";
import "./ops.css";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const user = await requireChatGPTUser("/ops");
  const access = await getOpsAccess();

  if (!access.ok) {
    return (
      <main className="ops-shell ops-access-shell">
        <section className="ops-access-card">
          <span className="ops-badge">QZ OPS / ACCESS</span>
          <h1>运营工作台已受保护</h1>
          <p>{access.error}</p>
          <dl><div><dt>当前账号</dt><dd>{user.email}</dd></div><div><dt>数据状态</dt><dd>未读取任何运营记录</dd></div></dl>
          <div className="ops-actions"><Link className="ops-button primary" href="/">返回公开作品集</Link><a className="ops-button" href={chatGPTSignOutPath("/ops")}>切换账号</a></div>
        </section>
      </main>
    );
  }

  return <OpsWorkbench currentUser={access.user.email} role={access.role} signOutPath={chatGPTSignOutPath("/")} />;
}
