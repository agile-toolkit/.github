# Agile Toolkit

**Small, focused web apps for day-to-day agile practice** — planning, facilitation, metrics, and team health. Each tool is its own repository: same stack (React, TypeScript, Vite), shipped where it helps teams most.

---

## Apps

Each app is deployed to **GitHub Pages** at **`https://agile-toolkit.github.io/<repo>/`** (same path as the repository name). If a link returns 404, enable **Settings → Pages → Build and deployment → GitHub Actions** in that repo.

| App | What it’s for | Live |
|-----|----------------|------|
| [**Change planner**](https://github.com/agile-toolkit/change-planner) | Structure and communicate change across teams and releases. | [Pages](https://agile-toolkit.github.io/change-planner/) |
| [**Improvement board**](https://github.com/agile-toolkit/improvement-board) | Surface improvements, experiments, and follow-through from retros and daily work. | [Pages](https://agile-toolkit.github.io/improvement-board/) |
| [**Kanban designer**](https://github.com/agile-toolkit/kanban-designer) | Design and iterate on boards and flow without fighting the tool. | [Pages](https://agile-toolkit.github.io/kanban-designer/) |
| [**Planning poker**](https://github.com/agile-toolkit/planning-poker) | Lightweight estimation sessions with a shared view of the table. | [Pages](https://agile-toolkit.github.io/planning-poker/) |
| [**Sprint metrics**](https://github.com/agile-toolkit/sprint-metrics) | Burn-down, forecast, and sprint data in one place for the current iteration. | [Pages](https://agile-toolkit.github.io/sprint-metrics/) |
| [**Scrum facilitator**](https://github.com/agile-toolkit/scrum-facilitator) | Support scrum events and facilitation with clear, guided flows. | [Pages](https://agile-toolkit.github.io/scrum-facilitator/) |
| [**Moving motivators**](https://github.com/agile-toolkit/moving-motivators) | Explore motivation and priorities with a familiar card-based exercise. | [Pages](https://agile-toolkit.github.io/moving-motivators/) |
| [**Work profiles**](https://github.com/agile-toolkit/work-profiles) | Roles, expectations, and how people prefer to collaborate. | [Pages](https://agile-toolkit.github.io/work-profiles/) |
| [**Team identity**](https://github.com/agile-toolkit/team-identity) | Align on who the team is and how you want to show up together. | [Pages](https://agile-toolkit.github.io/team-identity/) |
| [**Salary formula**](https://github.com/agile-toolkit/salary-formula) | Transparent, formula-based compensation models teams can reason about. | [Pages](https://agile-toolkit.github.io/salary-formula/) |

---

## Stack and conventions

- **UI:** React 18, Tailwind CSS where applicable  
- **Build:** Vite, TypeScript (`tsc` + production bundle)  
- **i18n:** Many apps use **react-i18next** for English and Russian  
- **Hosting:** GitHub Pages from `main` (see each repo’s `.github/workflows/deploy.yml`)

---

## Contributing

Pick a repo, clone it, run `npm ci` and `npm run dev`. Issues and PRs belong in that app’s repository; cross-cutting ideas can start in any repo and we’ll split work as needed.

---

*Agile Toolkit — practical tools for teams that ship together.*
