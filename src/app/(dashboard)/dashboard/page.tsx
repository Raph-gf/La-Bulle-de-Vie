import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import TodayAgendaCard from "@/components/dashboard/TodayAgendaCard"

const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
const DAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

function todayLabel() {
  const d = new Date()
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}

function fmtTime(t: string) {
  return t.replace(":", "h")
}


export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = await prisma.profile.findUnique({
    where: { id: user!.id },
    select: { fullName: true },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [todayAppts, pendingReviews, newClients, avgRating, upcomingCount] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        slot: { date: { gte: today, lt: tomorrow } },
        status: { not: "cancelled" },
      },
      orderBy: { slot: { startTime: "asc" } },
      select: {
        id: true,
        status: true,
        location: true,
        clientAddress: true,
        notes: true,
        isFirstVisit: true,
        client: { select: { fullName: true } },
        guestName: true,
        guestEmail: true,
        service: { select: { name: true, price: true, durationMinutes: true } },
        slot: { select: { date: true, startTime: true } },
      },
    }),
    prisma.review.count({ where: { approved: false } }),
    prisma.profile.count({
      where: { role: "client", createdAt: { gte: weekAgo } },
    }),
    prisma.review.aggregate({
      where: { approved: true },
      _avg: { stars: true },
      _count: { stars: true },
    }),
    prisma.appointment.count({
      where: {
        slot: { date: { gte: today } },
        status: { not: "cancelled" },
      },
    }),
  ])

  const firstName = profile?.fullName?.split(" ")[0] ?? "Praticienne"
  const avgStars = avgRating._avg.stars ? Math.round(avgRating._avg.stars * 10) / 10 : null
  const reviewCount = avgRating._count.stars

  // Serialize Date objects → strings before passing to client components
  const todayApptsForClient = todayAppts.map(a => ({
    ...a,
    status: a.status as string,
    slot: { ...a.slot, date: (a.slot.date as unknown as Date).toISOString() },
  }))

  return (
    <div className="view active">
      <div className="view-head">
        <div>
          <h1>Bonjour, <span className="italic">{firstName}.</span></h1>
          <p className="lede">
            {todayLabel()} — {todayAppts.length > 0
              ? `${todayAppts.length} séance${todayAppts.length > 1 ? "s" : ""} au programme.`
              : "Aucun rendez-vous aujourd'hui."}
          </p>
        </div>
        <div className="actions">
          <Link href="/dashboard/disponibilites" className="tbtn ghost">Gérer les disponibilités</Link>
          <Link href="/dashboard/rendez-vous" className="tbtn">Voir les RDV →</Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi feat">
          <div className="lbl">RDV à venir</div>
          <div className="v">{upcomingCount}</div>
          <div className="delta up"><span className="arr">↗</span> sur les 60 prochains jours</div>
          <div className="spark">
            <svg viewBox="0 0 80 32" preserveAspectRatio="none">
              <path d="M0,24 L10,20 L20,22 L30,15 L40,18 L50,10 L60,12 L70,6 L80,8" fill="none" stroke="#D89175" strokeWidth="2"/>
            </svg>
          </div>
        </div>

        <div className="kpi">
          <div className="lbl">RDV du jour</div>
          <div className="v">{todayAppts.length}</div>
          {todayAppts.length > 0 ? (
            <div className="delta up">
              <span className="arr">↗</span> {todayAppts.filter(a => a.status === "confirmed").length} confirmé{todayAppts.filter(a => a.status === "confirmed").length > 1 ? "s" : ""}
            </div>
          ) : (
            <div className="delta" style={{ color: "var(--mute)" }}>Aucun rendez-vous prévu</div>
          )}
        </div>

        <div className="kpi">
          <div className="lbl">Nouveaux clients (7j)</div>
          <div className="v">{newClients}</div>
          <div className={`delta ${newClients > 0 ? "up" : ""}`} style={newClients === 0 ? { color: "var(--mute)" } : {}}>
            {newClients > 0
              ? <><span className="arr">↗</span> cette semaine</>
              : "Aucun nouveau cette semaine"}
          </div>
        </div>

        <div className="kpi">
          <div className="lbl">Note moyenne</div>
          <div className="v">
            {avgStars !== null ? avgStars : "—"}<small>{avgStars !== null ? "/5" : ""}</small>
          </div>
          <div className="delta up">
            {reviewCount > 0
              ? <><span className="arr">★</span> {reviewCount} avis approuvé{reviewCount > 1 ? "s" : ""}</>
              : <span style={{ color: "var(--mute)" }}>Aucun avis encore</span>}
          </div>
        </div>
      </div>

      {/* Two-col: agenda + alerts/activity */}
      <div className="row-2" style={{ marginTop: 0 }}>
        {/* Today's agenda */}
        <TodayAgendaCard initialAppts={todayApptsForClient} />

        {/* Right column: alerts + activity */}
        <div className="col-stack">
          {/* Alerts */}
          <div className="card">
            <div className="card-head">
              <h3>Alertes</h3>
              {pendingReviews > 0 && (
                <span className="status danger">{pendingReviews} en attente</span>
              )}
            </div>
            <div className="alert-list">
              {pendingReviews > 0 && (
                <div className="alert warn">
                  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width={18} height={18}>
                    <path d="M12 4 2 20h20z"/><path d="M12 10v5M12 18v.5"/>
                  </svg>
                  <div className="body">
                    <strong>{pendingReviews} avis</strong> en attente d'approbation
                  </div>
                  <Link href="/dashboard/avis" className="link" style={{ textDecoration: "none" }}>Voir →</Link>
                </div>
              )}
              <div className="alert info">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width={18} height={18}>
                  <path d="M5 12l5 5L20 7"/>
                </svg>
                <div className="body">
                  <strong>Stripe</strong> — paiements en ligne bientôt disponibles.
                </div>
              </div>
              {upcomingCount === 0 && (
                <div className="alert warn">
                  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width={18} height={18}>
                    <path d="M12 4 2 20h20z"/><path d="M12 10v5M12 18v.5"/>
                  </svg>
                  <div className="body">
                    <strong>Aucun créneau</strong> disponible — configurez vos disponibilités.
                  </div>
                  <Link href="/dashboard/disponibilites" className="link" style={{ textDecoration: "none" }}>Configurer →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Activity feed */}
          <div className="card">
            <div className="card-head">
              <h3>Activité récente</h3>
              <Link href="/dashboard/rendez-vous" className="tab-mini" style={{ textDecoration: "none" }}>Tout voir</Link>
            </div>
            {todayAppts.length > 0 ? (
              <div className="feed">
                {todayAppts.slice(0, 5).map((appt) => {
                  const name = appt.client?.fullName ?? appt.guestName ?? "Invité"
                  return (
                    <div key={appt.id} className="feed-row">
                      <div className="av">{name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="body">
                          <strong>{name}</strong> — <em>{appt.service.name}</em> à {fmtTime(appt.slot.startTime)}
                        </div>
                        <div className="when">
                          {appt.status === "confirmed" ? "Confirmé" : "En attente de confirmation"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ color: "var(--mute)", fontSize: 13, fontStyle: "italic" }}>
                Aucune activité aujourd'hui.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Revenue + Upcoming overview */}
      <div className="row-2" style={{ marginTop: 18 }}>
        {/* Revenue chart placeholder */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Revenus</h3>
              <div className="sub">Intégration Stripe à venir — paiements en ligne</div>
            </div>
            <div className="tabs">
              <button className="tab-mini">7j</button>
              <button className="tab-mini active">30j</button>
              <button className="tab-mini">12 mois</button>
            </div>
          </div>
          <div className="chart-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <svg viewBox="0 0 320 120" style={{ width: "100%", maxWidth: 320, opacity: .3 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--terra)" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="var(--terra)" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,90 L40,70 L80,80 L120,55 L160,65 L200,40 L240,45 L280,25 L320,30 L320,120 L0,120 Z" fill="url(#areaGrad)"/>
                <path d="M0,90 L40,70 L80,80 L120,55 L160,65 L200,40 L240,45 L280,25 L320,30" fill="none" stroke="var(--terra)" strokeWidth="2"/>
              </svg>
              <p style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--mute)", fontStyle: "italic", marginTop: 8 }}>
                Activez Stripe pour suivre vos revenus
              </p>
              <Link href="/dashboard/parametres" className="tbtn ghost" style={{ marginTop: 12, textDecoration: "none", display: "inline-flex" }}>
                Configurer →
              </Link>
            </div>
          </div>
        </div>

        {/* Next appointments summary */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Prochains RDV</h3>
              <div className="sub">{upcomingCount} créneaux réservés à venir</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcomingCount === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <p style={{ color: "var(--mute)", fontSize: 13, fontStyle: "italic", marginBottom: 16 }}>
                  Aucun rendez-vous à venir.
                </p>
                <Link href="/dashboard/disponibilites" className="tbtn" style={{ textDecoration: "none" }}>
                  Configurer les disponibilités
                </Link>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed var(--line)", fontSize: 13 }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>Aujourd'hui</span>
                  <span style={{ color: "var(--terra)" }}>{todayAppts.length} séance{todayAppts.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed var(--line)", fontSize: 13 }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>À venir (total)</span>
                  <span style={{ color: "var(--terra)" }}>{upcomingCount}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 13 }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>Avis en attente</span>
                  <span style={{ color: pendingReviews > 0 ? "var(--terra)" : "var(--mute)" }}>{pendingReviews}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Link href="/dashboard/rendez-vous" className="tbtn" style={{ textDecoration: "none", width: "100%", justifyContent: "center" }}>
                    Voir tous les rendez-vous →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
