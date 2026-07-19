import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  LayoutDashboard,
  Users,
  Package,
  Settings,
  Search,
  Bell,
  Plus,
  Download,
  Send,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  DollarSign,
  FileCheck,
  AlertCircle,
  ChevronRight,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NFeFácil — Emissão de Nota Fiscal Eletrônica" },
      {
        name: "description",
        content:
          "Emita, gerencie e acompanhe suas Notas Fiscais Eletrônicas (NF-e) em um único painel.",
      },
    ],
  }),
  component: Index,
});

type View = "dashboard" | "emitir" | "notas" | "clientes" | "produtos" | "config";

function Index() {
  const [view, setView] = useState<View>("dashboard");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar view={view} setView={setView} />
        <div className="flex-1 min-w-0">
          <Topbar />
          <main className="px-8 py-8 max-w-[1400px] mx-auto">
            {view === "dashboard" && <Dashboard onEmit={() => setView("emitir")} />}
            {view === "emitir" && <EmitirNFe />}
            {view === "notas" && <ListaNotas />}
            {view === "clientes" && <Placeholder title="Clientes" icon={<Users className="size-6" />} />}
            {view === "produtos" && <Placeholder title="Produtos" icon={<Package className="size-6" />} />}
            {view === "config" && <Placeholder title="Configurações" icon={<Settings className="size-6" />} />}
          </main>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const items: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Painel", icon: <LayoutDashboard className="size-4" /> },
    { id: "emitir", label: "Emitir NF-e", icon: <Plus className="size-4" /> },
    { id: "notas", label: "Notas Emitidas", icon: <FileText className="size-4" /> },
    { id: "clientes", label: "Clientes", icon: <Users className="size-4" /> },
    { id: "produtos", label: "Produtos", icon: <Package className="size-4" /> },
    { id: "config", label: "Configurações", icon: <Settings className="size-4" /> },
  ];
  return (
    <aside className="w-64 border-r border-border bg-card sticky top-0 h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <FileCheck className="size-5" />
          </div>
          <div>
            <div className="font-semibold leading-tight">NFeFácil</div>
            <div className="text-xs text-muted-foreground">Emissão de NF-e</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors " +
                (active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground")
              }
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="rounded-lg bg-secondary p-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-2 rounded-full" style={{ background: "var(--success)" }} />
            SEFAZ Online
          </div>
          <div className="text-muted-foreground mt-1">Ambiente: Produção</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="relative w-96 max-w-full">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full h-10 pl-9 pr-3 rounded-md bg-secondary border border-transparent focus:border-ring focus:bg-background outline-none text-sm"
          placeholder="Buscar notas, clientes, produtos..."
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="relative size-10 rounded-md hover:bg-secondary grid place-items-center text-muted-foreground">
          <Bell className="size-4" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
        </button>
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">Ana Ribeiro</div>
            <div className="text-xs text-muted-foreground">Comercial LTDA</div>
          </div>
          <div className="size-9 rounded-full bg-gradient-to-br from-primary to-[oklch(0.55_0.14_200)] text-primary-foreground grid place-items-center text-sm font-medium">
            AR
          </div>
        </div>
      </div>
    </header>
  );
}

function Dashboard({ onEmit }: { onEmit: () => void }) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel de emissão</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral das suas notas fiscais eletrônicas — Julho / 2026
          </p>
        </div>
        <button
          onClick={onEmit}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium shadow-sm"
        >
          <Plus className="size-4" /> Emitir nova NF-e
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Notas emitidas" value="248" delta="+12,5%" icon={<FileCheck className="size-5" />} tone="primary" />
        <StatCard label="Faturamento" value="R$ 184.520" delta="+8,2%" icon={<DollarSign className="size-5" />} tone="success" />
        <StatCard label="Pendentes SEFAZ" value="4" delta="-2" icon={<Clock className="size-5" />} tone="warning" />
        <StatCard label="Rejeitadas" value="1" delta="—" icon={<AlertCircle className="size-5" />} tone="destructive" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold">Emissões nos últimos 7 dias</h2>
              <p className="text-xs text-muted-foreground">Quantidade de NF-e autorizadas por dia</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5" style={{ color: "var(--success)" }} /> +18% vs. semana anterior
            </div>
          </div>
          <BarChart />
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Ações rápidas</h2>
          <div className="space-y-2">
            <QuickAction icon={<Plus className="size-4" />} label="Nova NF-e" desc="Emitir para cliente" onClick={onEmit} />
            <QuickAction icon={<Users className="size-4" />} label="Novo cliente" desc="Cadastrar destinatário" />
            <QuickAction icon={<Package className="size-4" />} label="Novo produto" desc="Adicionar ao catálogo" />
            <QuickAction icon={<Download className="size-4" />} label="Exportar XMLs" desc="Baixar do mês" />
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Últimas notas emitidas</h2>
          <button className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver todas <ChevronRight className="size-4" />
          </button>
        </div>
        <NotasTable rows={SAMPLE_NOTAS.slice(0, 5)} />
      </div>
    </div>
  );
}

function StatCard({
  label, value, delta, icon, tone,
}: {
  label: string; value: string; delta: string; icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneColor: Record<string, string> = {
    primary: "var(--primary)",
    success: "var(--success)",
    warning: "var(--warning)",
    destructive: "var(--destructive)",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{delta} vs. mês anterior</div>
        </div>
        <div className="size-10 rounded-lg grid place-items-center"
          style={{ background: `color-mix(in oklch, ${toneColor[tone]} 12%, transparent)`, color: toneColor[tone] }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function BarChart() {
  const data = [12, 18, 9, 24, 21, 30, 27];
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const max = Math.max(...data);
  return (
    <div className="flex items-end justify-between gap-3 h-52">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
          <div className="w-full flex items-end justify-center flex-1">
            <div
              className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-primary to-[oklch(0.6_0.14_215)] transition-all hover:opacity-80"
              style={{ height: `${(v / max) * 100}%` }}
              title={`${v} notas`}
            />
          </div>
          <div className="text-xs text-muted-foreground">{days[i]}</div>
        </div>
      ))}
    </div>
  );
}

function QuickAction({
  icon, label, desc, onClick,
}: { icon: React.ReactNode; label: string; desc: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors group">
      <div className="size-9 rounded-md bg-secondary group-hover:bg-background grid place-items-center text-primary">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  );
}

type Nota = {
  numero: string; cliente: string; data: string; valor: string;
  status: "autorizada" | "pendente" | "rejeitada" | "cancelada";
};

const SAMPLE_NOTAS: Nota[] = [
  { numero: "000.248", cliente: "Mercado Bom Preço Ltda", data: "19/07/2026", valor: "R$ 4.820,00", status: "autorizada" },
  { numero: "000.247", cliente: "Auto Peças Silva ME", data: "19/07/2026", valor: "R$ 1.230,50", status: "autorizada" },
  { numero: "000.246", cliente: "Padaria Estrela EIRELI", data: "18/07/2026", valor: "R$ 890,00", status: "pendente" },
  { numero: "000.245", cliente: "Construtora Alfa S/A", data: "18/07/2026", valor: "R$ 12.450,00", status: "autorizada" },
  { numero: "000.244", cliente: "Farmácia Central", data: "17/07/2026", valor: "R$ 320,00", status: "rejeitada" },
  { numero: "000.243", cliente: "Livraria Cultura Ltda", data: "17/07/2026", valor: "R$ 2.180,90", status: "cancelada" },
  { numero: "000.242", cliente: "TechStore Comércio", data: "16/07/2026", valor: "R$ 6.700,00", status: "autorizada" },
];

function NotasTable({ rows }: { rows: Nota[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide">
            <th className="px-6 py-3 font-medium">Nº</th>
            <th className="px-6 py-3 font-medium">Cliente</th>
            <th className="px-6 py-3 font-medium">Data</th>
            <th className="px-6 py-3 font-medium">Valor</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => (
            <tr key={n.numero} className="border-t border-border hover:bg-secondary/50">
              <td className="px-6 py-3 font-mono text-xs">{n.numero}</td>
              <td className="px-6 py-3">{n.cliente}</td>
              <td className="px-6 py-3 text-muted-foreground">{n.data}</td>
              <td className="px-6 py-3 font-medium">{n.valor}</td>
              <td className="px-6 py-3"><StatusBadge status={n.status} /></td>
              <td className="px-6 py-3">
                <div className="flex items-center justify-end gap-1">
                  <IconBtn title="Baixar XML"><Download className="size-4" /></IconBtn>
                  <IconBtn title="Imprimir DANFE"><Printer className="size-4" /></IconBtn>
                  <IconBtn title="Enviar por e-mail"><Send className="size-4" /></IconBtn>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IconBtn({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <button title={title} className="size-8 rounded-md hover:bg-background text-muted-foreground hover:text-foreground grid place-items-center border border-transparent hover:border-border transition">
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: Nota["status"] }) {
  const map = {
    autorizada: { label: "Autorizada", color: "var(--success)", icon: <CheckCircle2 className="size-3" /> },
    pendente: { label: "Pendente", color: "var(--warning)", icon: <Clock className="size-3" /> },
    rejeitada: { label: "Rejeitada", color: "var(--destructive)", icon: <XCircle className="size-3" /> },
    cancelada: { label: "Cancelada", color: "var(--muted-foreground)", icon: <XCircle className="size-3" /> },
  } as const;
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
      style={{ background: `color-mix(in oklch, ${s.color} 14%, transparent)`, color: s.color }}>
      {s.icon}{s.label}
    </span>
  );
}

function ListaNotas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notas emitidas</h1>
        <p className="text-sm text-muted-foreground mt-1">Histórico completo de NF-e</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {["Todas", "Autorizadas", "Pendentes", "Rejeitadas", "Canceladas"].map((f, i) => (
          <button key={f} className={"px-3 py-1.5 rounded-md text-sm border transition-colors " + (i === 0 ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-secondary")}>
            {f}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card">
        <NotasTable rows={SAMPLE_NOTAS} />
      </div>
    </div>
  );
}

function EmitirNFe() {
  const [items, setItems] = useState([
    { id: 1, desc: "Serviço de consultoria", ncm: "9999.99", qtd: 1, valor: 1500 },
  ]);
  const total = items.reduce((s, i) => s + i.qtd * i.valor, 0);
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Nova emissão</div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">Emitir NF-e</h1>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-md border border-border bg-card text-sm hover:bg-secondary">Salvar rascunho</button>
          <button className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center gap-2 shadow-sm">
            <Send className="size-4" /> Transmitir para SEFAZ
          </button>
        </div>
      </div>

      <Section title="Destinatário" icon={<Building2 className="size-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Field label="CNPJ / CPF" className="md:col-span-2" placeholder="00.000.000/0000-00" />
          <Field label="Razão social" className="md:col-span-4" placeholder="Nome do destinatário" />
          <Field label="Inscrição estadual" className="md:col-span-2" placeholder="Isento" />
          <Field label="E-mail" className="md:col-span-4" placeholder="cliente@empresa.com" />
          <Field label="CEP" className="md:col-span-2" placeholder="00000-000" />
          <Field label="Endereço" className="md:col-span-3" placeholder="Rua, número" />
          <Field label="UF" className="md:col-span-1" placeholder="SP" />
        </div>
      </Section>

      <Section title="Produtos e serviços" icon={<Package className="size-4" />}>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs text-muted-foreground uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Descrição</th>
                <th className="px-4 py-2 text-left font-medium w-28">NCM</th>
                <th className="px-4 py-2 text-right font-medium w-20">Qtd</th>
                <th className="px-4 py-2 text-right font-medium w-32">Valor unit.</th>
                <th className="px-4 py-2 text-right font-medium w-32">Total</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="px-4 py-2"><input defaultValue={it.desc} className="w-full bg-transparent outline-none focus:bg-secondary rounded px-2 py-1" /></td>
                  <td className="px-4 py-2"><input defaultValue={it.ncm} className="w-full bg-transparent outline-none focus:bg-secondary rounded px-2 py-1 font-mono text-xs" /></td>
                  <td className="px-4 py-2"><input type="number" defaultValue={it.qtd} className="w-full bg-transparent outline-none focus:bg-secondary rounded px-2 py-1 text-right" /></td>
                  <td className="px-4 py-2"><input type="number" defaultValue={it.valor} className="w-full bg-transparent outline-none focus:bg-secondary rounded px-2 py-1 text-right" /></td>
                  <td className="px-4 py-2 text-right font-medium">{brl(it.qtd * it.valor)}</td>
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => setItems((s) => s.filter((x) => x.id !== it.id))} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => setItems((s) => [...s, { id: Date.now(), desc: "", ncm: "", qtd: 1, valor: 0 }])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Plus className="size-4" /> Adicionar item
        </button>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section title="Tributação e transporte" icon={<FileText className="size-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField label="Natureza da operação" options={["Venda de mercadoria", "Prestação de serviço", "Devolução"]} />
              <SelectField label="CFOP" options={["5102 - Venda", "5405 - Venda ST", "6108 - Venda outra UF"]} />
              <SelectField label="Regime tributário" options={["Simples Nacional", "Lucro Presumido", "Lucro Real"]} />
              <SelectField label="Modalidade frete" options={["Sem frete", "Emitente", "Destinatário"]} />
              <Field label="Transportadora" placeholder="—" className="md:col-span-2" />
            </div>
          </Section>
        </div>
        <div>
          <div className="rounded-xl border border-border bg-card p-6 sticky top-24">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Resumo</div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Subtotal" value={brl(total)} />
              <Row label="Desconto" value="R$ 0,00" />
              <Row label="ICMS (18%)" value={brl(total * 0.18)} muted />
              <Row label="PIS/COFINS" value={brl(total * 0.0925)} muted />
            </div>
            <div className="border-t border-border mt-4 pt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total NF-e</span>
              <span className="text-xl font-semibold">{brl(total)}</span>
            </div>
            <button className="mt-5 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 inline-flex items-center justify-center gap-2 shadow-sm">
              <Send className="size-4" /> Transmitir
            </button>
            <button className="mt-2 w-full h-10 rounded-md border border-border bg-card text-sm hover:bg-secondary inline-flex items-center justify-center gap-2">
              <Printer className="size-4" /> Pré-visualizar DANFE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={muted ? "text-muted-foreground" : "font-medium"}>{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="size-7 rounded-md bg-secondary text-primary grid place-items-center">{icon}</div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, placeholder, className = "" }: { label: string; placeholder?: string; className?: string }) {
  return (
    <label className={"block " + className}>
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      <input placeholder={placeholder} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none text-sm transition" />
    </label>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      <select className="w-full h-10 px-3 rounded-md border border-input bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none text-sm">
        {options.map((o) => (<option key={o}>{o}</option>))}
      </select>
    </label>
  );
}

function Placeholder({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
      <div className="size-12 rounded-lg bg-secondary text-primary grid place-items-center mx-auto">{icon}</div>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">Módulo visual — em breve conectado ao seu cadastro.</p>
    </div>
  );
}