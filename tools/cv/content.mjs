// The CV as data. Both versions come from here, so the public CV on the site and the longer
// one with client engagements can never drift apart. Counts that the site can prove are read
// from data/; the two headline figures (450+ and 250+) are set by hand on purpose and match
// the homepage.
//
// Style rules, kept on purpose:
//   - Every bullet opens with a verb and, where there is one, carries a number.
//   - No "I" or "my", no filler ("hands on", "among others", "passionate"), no long dashes.
//   - Acronyms sit next to their full form once, so a recruiter searching either finds it.
//   - Date ranges read "Nov 2023 to Present".
//   - Nothing goes in that the portfolio or an email cannot back up.
//
// A bullet can be a plain string (both versions) or { text, only: "public" | "clients" }.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const json = (f) => JSON.parse(readFileSync(join(root, f), "utf8"));

export function facts() {
  const { orgs, countries } = json("data/orgs.json");
  return {
    orgsHeadline: "450+",
    hofHeadline: "250+",
    first: orgs.filter((o) => o.first).length,
    publicPages: orgs.filter((o) => o.url).length,
    countries: countries.filter((c) => c.lat !== null && c.count > 0).length,
  };
}

// The private file holds client engagements and references. It is gitignored and never
// published, because the repository is public. See tools/cv/README.md for its shape.
export const PRIVATE_FILE = join(root, "private/cv-clients.json");
export const loadPrivate = () => (existsSync(PRIVATE_FILE) ? JSON.parse(readFileSync(PRIVATE_FILE, "utf8")) : null);

const CONTACT = [
  { text: "parth.narula@scriptjacker.in", href: "mailto:parth.narula@scriptjacker.in", strong: true },
  { text: "+91 74970 54662", href: "tel:+917497054662" },
  { text: "India", lineEnd: true },
  { text: "parthnarula.scriptjacker.in", href: "https://parthnarula.scriptjacker.in/" },
  { text: "linkedin.com/in/parth-narula-86283821a", href: "https://www.linkedin.com/in/parth-narula-86283821a/" },
  { text: "github.com/scriptjacker", href: "https://github.com/scriptjacker" },
];

const SKILLS = [
  ["Offensive testing", "Vulnerability Assessment and Penetration Testing (VAPT) of web applications, REST and GraphQL APIs, Android apps, cloud, and LLM and AI applications; network security and infrastructure testing; red teaming; black, grey and white box testing; reconnaissance, OSINT and manual exploitation"],
  ["Application security", "web application security, secure code review, threat modeling, secure SDLC, SAST, DAST, software composition analysis (SCA), CI/CD and DevSecOps, container security"],
  ["Vulnerabilities", "broken access control (IDOR, BOLA), privilege escalation, business logic flaws, authentication, OAuth 2.0 and OpenID Connect, JWT attacks, SSRF, SQL injection, cross site scripting (XSS), CSRF, SSTI, race conditions, mass assignment, CORS, subdomain takeover, prompt injection"],
  ["Methodology", "OWASP Top 10, OWASP API Security Top 10, OWASP Top 10 for LLM Applications, OWASP Web Security Testing Guide (WSTG), PTES, MITRE ATT&CK, CVSS, ISO 27001, risk rating, vulnerability management"],
  ["Tools", "Burp Suite, OWASP ZAP, Nmap, Nessus, Qualys, Metasploit, Wireshark, Postman, Frida, MobSF, jadx"],
  ["Cloud security and platforms", "AWS, Azure and Azure AD, Google Cloud (GCP), Firebase, identity and access management (IAM), Docker, Kubernetes, Linux, Kali Linux, Windows, Active Directory, TCP/IP, DNS, firewalls"],
  ["Programming", "Python, Bash, PowerShell, JavaScript, PHP, SQL, Ruby, C, C++, Git"],
];

const CERTS = [
  ["Certified Ethical Hacker (CEH v13)", "EC-Council", "Nov 2025"],
  ["Web Application Penetration Tester eXtreme (eWPTX v3)", "INE Security", "Dec 2025"],
  ["eLearnSecurity Junior Penetration Tester (eJPT v2)", "INE Security", "Jan 2026"],
  ["APIsec Certified Practitioner (ACP)", "APIsec University", "Mar 2026"],
  ["Ethical Hacker", "Cisco Networking Academy", "Nov 2025"],
  ["Ethical Hacking Essentials (EHE)", "EC-Council", "Feb 2022"],
];

const EDUCATION = [
  { title: "Bachelor of Computer Applications (BCA), Cybersecurity", org: "Lovely Professional University (LPU), Punjab", note: "CGPA 9.75", when: "Aug 2025 to Present" },
  { title: "Senior Secondary (Class XII), Commerce", org: "Vishvas Senior Secondary School, Hisar, Haryana", note: "86%", when: "Mar 2025" },
  { title: "Matriculation (Class X)", org: "St. Mary's School, Hisar, Haryana", note: "84%", when: "Mar 2023" },
];

export function buildCv({ variant = "public", priv = null } = {}) {
  const f = facts();
  const withClients = variant === "clients";
  if (withClients && !priv) throw new Error(`the client version needs ${PRIVATE_FILE}`);
  const keep = (list) => list.filter((b) => typeof b === "string" || b.only === variant).map((b) => (typeof b === "string" ? b : b.text));

  const headline = withClients
    ? "Penetration Tester | Application Security Consultant | Security Researcher"
    : "Penetration Tester and Security Researcher | Web, API, Mobile, Cloud and AI Security";

  const record = `Reported vulnerabilities to ${f.orgsHeadline} organizations including Apple, NVIDIA and the United Nations, with ${f.hofHeadline} Hall of Fame listings, a CVSS 9.0 Netwrix advisory and CVE-2025-56697. CEH, eWPTX, eJPT and APIsec certified.`;
  const summary = withClients
    ? `Penetration tester and application security consultant. Through ScriptJacker LLP, runs manual VAPT engagements for SaaS companies in the Netherlands, Belgium, Germany and Slovenia, covering web applications, APIs, Android apps and cloud. ${record} Open to penetration testing, security consulting and application security roles.`
    : `Penetration tester and security researcher working on web applications, APIs, Android apps, cloud and AI systems. Founder of ScriptJacker LLP, which has run manual security testing for 150+ clients. ${record} Open to penetration testing, VAPT and AppSec roles.`;

  const scriptjacker = {
    type: "job",
    title: "Founder and Lead Penetration Tester",
    org: "ScriptJacker LLP",
    when: "2023 to Present",
    bullets: keep([
      "Run manual Vulnerability Assessment and Penetration Testing (VAPT) for 150+ clients across web applications, REST and GraphQL APIs, Android apps, networks and cloud, with 2,500+ vulnerabilities reported and resolved.",
      "Agree scope and test type (black, grey or white box) with each client on a discovery call, then test against the OWASP Web Security Testing Guide (WSTG), PTES and the OWASP API Security Top 10.",
      "Write reports a developer can act on: CVSS score, reproduction steps, proof of concept, business impact and specific remediation for every finding.",
      { only: "public", text: "Test multi tenant SaaS products with separate tenant and role accounts, proving that one customer cannot read or change another customer's data." },
      "Review source code and threat model new features with developers, and add SAST and software composition analysis (SCA) to dynamic testing (DAST) in CI/CD pipelines.",
      "Reverse engineer Android apps with jadx and Frida, run MobSF static checks, and scan network and infrastructure targets with Nmap and Nessus before confirming each result by hand.",
      "Communicate findings to engineering teams on calls and retest every fix until each issue is closed.",
    ]),
  };
  if (withClients) {
    scriptjacker.subhead = "Selected client engagements";
    scriptjacker.engagements = priv.engagements;
    if (priv.otherClients) scriptjacker.otherClients = priv.otherClients;
  }

  const research = {
    type: "job",
    title: "Security Researcher",
    org: "Independent, bug bounty and vulnerability disclosure",
    when: "Nov 2023 to Present",
    bullets: keep([
      `Reported vulnerabilities to ${f.orgsHeadline} organizations in ${f.countries}+ countries, including Apple, NVIDIA, Nokia, WHO, UNESCO, CERT-EU and the United Nations. Listed on ${f.hofHeadline} Halls of Fame, and the first researcher on ${f.first} of them.`,
      "Found two flaws in Netwrix PingCastle, an Active Directory audit tool: updates installed without an integrity check, and a path traversal via prefix matching. Netwrix advisory ADV-2026-018 (CVSS 9.0), two CVEs pending.",
      "Published CVE-2025-56697 for a stored XSS, and reported SQL injection and information disclosure on Indian government sites through CERT-In.",
      { only: "public", text: "Exploited an IDOR exposing 85,000+ email addresses, turned mass assignment into account takeover, and reached shell access via an Apache Guacamole gateway on a Nokia subdomain found by Google dorking." },
      "Tested cloud and AI targets: subdomain takeover through a dangling AWS CNAME, Azure AD tenant disclosure, exposed managed databases, Firebase account enumeration, and OAuth flaws and blind SSRF in Model Context Protocol (MCP) servers.",
    ]),
  };

  const mentor = {
    type: "job",
    title: "Mentor, Bug Bounty and Web Security",
    org: "Unihackers",
    when: "Jun 2025 to Present",
    bullets: keep([
      "Mentor students and new bug hunters with real cases from past reports, and write guides on API testing, request tampering and prompt injection.",
      { only: "public", text: "Taught a web application penetration testing masterclass to about 150 students at Guru Jambheshwar University of Science and Technology, Hisar (Oct 2025), and gave a 57 slide AI security talk with live demos." },
    ]),
  };

  const intern = {
    type: "job",
    title: "Penetration Tester Intern",
    org: "Forensic Academy",
    when: "Aug 2023 to Sep 2023",
    bullets: ["Built and secured an enterprise network in Cisco Packet Tracer, then tested a live web application and wrote the report. Graded A+."],
  };

  const achievements = keep([
    "Ranked 21st of 10,000 (All India Rank 21) in the HackWithIndia 2026 Web Hacking Competition.",
    "Led team ScriptJackers to 9 CTF podium finishes and 7 wins, including 1st of 68 squads at Cyber Arena 2026 (CompTIA and Quick Heal Academy), TechFusion 2026, Rootbreach at NIT Jalandhar, Cyber War 2026, RCS 2026, Cyberthon 2026 and Encrypted CTF.",
    { only: "public", text: "Letters of appreciation from Thales PSIRT, Drexel University CISO, Maastricht University, GeeksforGeeks, Nykaa." },
  ]);

  const projects = [
    { title: "Agent driven penetration testing framework", org: "Python, private, in progress", when: "Jun 2026 to Present", text: "Automates reconnaissance and testing: AI agents choose the approach per target and call custom scripts.", only: "public" },
    { title: "ScriptJacker Recon Tool", org: "Python, Ruby, Bash, github.com/scriptjacker/scriptjacker", when: "May 2024", text: "Automates full reconnaissance in one run: subdomain enumeration, directory brute forcing, DNS recon, JavaScript analysis and vulnerability scanning." },
  ].filter((p) => !p.only || p.only === variant);

  const sections = [
    { heading: "Professional Summary", blocks: [{ type: "para", text: summary }] },
    { heading: "Skills", blocks: SKILLS.map(([label, text]) => ({ type: "kv", label, text })) },
    { heading: "Work Experience", blocks: [scriptjacker, research, mentor, intern] },
    { heading: "Certifications", blocks: CERTS.map(([name, issuer, when]) => ({ type: "line", strong: name, rest: issuer, when })) },
    { heading: "Achievements", blocks: [{ type: "bullets", items: achievements }] },
    { heading: "Projects", blocks: projects.map((p) => ({ type: "job", inlineDate: true, title: p.title, org: p.org, when: p.when, text: p.text })) },
    { heading: "Education", blocks: EDUCATION.map((e) => ({ type: "line", strong: e.title, rest: e.org, when: e.when, note: e.note })) },
  ];
  if (withClients && priv.references?.length) {
    sections.push({
      heading: "References",
      blocks: priv.references.map((r) => ({ type: "line", strong: r.name, rest: [r.role, r.org, r.email].filter(Boolean).join(", ") })),
    });
  }

  return {
    file: withClients ? "Parth-Narula-CV-Penetration-Tester" : "Parth-Narula-CV",
    meta: {
      title: `Parth Narula, ${withClients ? "Penetration Tester" : "Penetration Tester and Security Researcher"}, CV`,
      author: "Parth Narula",
      subject: "Curriculum vitae",
      keywords: "penetration tester, VAPT, application security, web application security, API security, bug bounty, OWASP, Burp Suite",
    },
    name: "Parth Narula",
    headline,
    contact: CONTACT,
    sections,
  };
}
