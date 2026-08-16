import type { Rubric, Submission } from "./types";

export const RUBRIC: Rubric = {
  id: "rubric-analytical",
  name: "Analytical Essay",
  categories: [
    {
      key: "thesis",
      label: "Thesis",
      max: 20,
      description: "Central claim is specific, arguable, and previews the argument.",
    },
    {
      key: "evidence",
      label: "Evidence",
      max: 20,
      description: "Specific, relevant, and correctly cited textual or research evidence.",
    },
    {
      key: "analysis",
      label: "Analysis",
      max: 20,
      description: "Depth of interpretation; explains how evidence supports the claim.",
    },
    {
      key: "organization",
      label: "Organization",
      max: 20,
      description: "Logical flow, paragraph structure, and transitions.",
    },
    {
      key: "conventions",
      label: "Conventions",
      max: 20,
      description: "Grammar, mechanics, and citation format.",
    },
  ],
};

export const CLASS_SIZE = 25;

export const SUBMISSIONS: Submission[] = [
  {
    id: "sub-alex-rivera",
    studentName: "Alex Rivera",
    classPosition: 3,
    classSize: CLASS_SIZE,
    title: "The Double-Edged Screen: Social Media and Adolescent Identity",
    prompt:
      "Using at least two credible sources, argue whether social media has a net positive or negative effect on adolescent identity formation.",
    paragraphs: [
      "Social media has completely changed how teenagers see themselves, and this change is mostly bad. Because platforms reward constant self-presentation, adolescents are pushed to build identities that are shaped more by an audience than by their own values, and this leads to anxiety rather than genuine growth. This essay will look at the problem.",
      "The most serious problem is that social media turns identity into a performance. Researchers have found that the average teenager spends over seven hours a day online, which means they are spending more time curating an image than actually living. When a person's sense of self depends on likes and follower counts, it becomes fragile and reactive instead of stable.",
      "This performance pressure is amplified by comparison. Teens scroll through highlight reels of other people's lives and measure their own ordinary moments against them. The result is what some call a 'compare-and-despair' cycle, where self-worth rises and falls with every post. This is not a neutral environment; it actively trains young people to evaluate themselves through metrics.",
      "There are, however, genuine benefits that should not be dismissed. Marginalized teens often find community online that they cannot access at school, and this can be a lifeline for identity exploration. Studies show that LGBTQ+ youth report higher well-being when they have supportive online networks, suggesting the platform itself is not the problem but the way it is used.",
      "In the end, social media is a tool, and like any tool its effect depends on how it is wielded. The current design incentives, though, reward exactly the behaviors that harm adolescent development. If platforms were redesigned to prioritize authentic connection over engagement metrics, the same technology could support rather than undermine identity formation.",
    ],
    highlights: [
      {
        id: "hl-1",
        startLine: 0,
        endLine: 0,
        kind: "weak-thesis",
        reason: "Weak thesis",
        suggestion:
          "The claim ('mostly bad') is broad and judgmental rather than arguable. Propose a sharper, qualified position that names the mechanism and the stakes.",
      },
      {
        id: "hl-2",
        startLine: 1,
        endLine: 1,
        kind: "uncited-claim",
        reason: "Uncited claim",
        suggestion:
          "The 'seven hours a day' statistic is asserted with no source. Cite the study or survey and its year.",
      },
      {
        id: "hl-3",
        startLine: 3,
        endLine: 3,
        kind: "uncited-claim",
        reason: "Uncited claim",
        suggestion:
          "'Studies show' without a named source. Add an inline citation for the LGBTQ+ well-being research.",
      },
      {
        id: "hl-4",
        startLine: 2,
        endLine: 2,
        kind: "vague-evidence",
        reason: "Vague evidence",
        suggestion:
          "'Compare-and-despair' is asserted rather than demonstrated. Ground the term in a source or a concrete example.",
      },
    ],
    scores: [
      {
        key: "thesis",
        label: "Thesis",
        score: 16,
        max: 20,
        feedback: "Clear but hedged; sharpen the central claim and preview the stakes.",
      },
      {
        key: "evidence",
        label: "Evidence",
        score: 14,
        max: 20,
        feedback: "Two statistics are asserted without sources; citations are missing.",
      },
      {
        key: "analysis",
        label: "Analysis",
        score: 15,
        max: 20,
        feedback: "Solid but occasionally summarizes instead of interpreting.",
      },
      {
        key: "organization",
        label: "Organization",
        score: 17,
        max: 20,
        feedback: "Strong structure; tighten the concession transition in paragraph 4.",
      },
      {
        key: "conventions",
        label: "Conventions",
        score: 18,
        max: 20,
        feedback: "Clean prose; watch comma splices and informal register.",
      },
    ],
    overallNote:
      "A coherent essay that would benefit most from sharper claims and real citations.",
  },
  {
    id: "sub-priya-patel",
    studentName: "Priya Patel",
    classPosition: 11,
    classSize: CLASS_SIZE,
    title: "Automation and the Future of Work",
    prompt:
      "Argue whether automation will create more jobs than it eliminates, using evidence from at least two sources.",
    paragraphs: [
      "Automation is often framed as an existential threat to work, but the historical record suggests the opposite: technological change has consistently created more jobs than it destroyed. The real question is not whether jobs will disappear but whether workers will be equipped to move into the new roles that emerge.",
      "The strongest evidence is historical. When the assembly line spread across manufacturing, many feared mass unemployment, yet employment in adjacent industries such as logistics and maintenance expanded dramatically. According to the Bureau of Labor Statistics, occupations that did not exist in 1990 now employ tens of millions of Americans.",
      "Skeptics point out that this time may be different, because AI can perform cognitive tasks that were once uniquely human. This concern deserves attention, but it underestimates the way new technologies generate demand for complementary skills. For every routine task that is automated, new work appears in oversight, personalization, and human judgment.",
      "The policy response will determine the outcome. Countries that invest in retraining and income support during transitions tend to see smaller disruptions and faster recoveries. Germany's Kurzarbeit program, which subsidized short-time work during downturns, is widely credited with preserving skills and smoothing automation shocks.",
      "Automation is not a force of nature; it is a set of choices made by firms and governments. If those choices prioritize investment in people, the transition can be one of expansion rather than elimination. The fear is real, but the fatalism is misplaced.",
    ],
    highlights: [
      {
        id: "hl-5",
        startLine: 0,
        endLine: 0,
        kind: "weak-thesis",
        reason: "Weak thesis",
        suggestion:
          "The thesis relies on an unstated assumption ('historical record suggests'). Make the causal claim explicit.",
      },
      {
        id: "hl-6",
        startLine: 1,
        endLine: 1,
        kind: "uncited-claim",
        reason: "Uncited claim",
        suggestion:
          "The BLS statistic is paraphrased without a year or report title. Add a complete citation.",
      },
    ],
    scores: [
      {
        key: "thesis",
        label: "Thesis",
        score: 17,
        max: 20,
        feedback: "Engaging but the causal claim is implicit rather than stated.",
      },
      {
        key: "evidence",
        label: "Evidence",
        score: 16,
        max: 20,
        feedback: "Good range of examples; citations need dates and specificity.",
      },
      {
        key: "analysis",
        label: "Analysis",
        score: 18,
        max: 20,
        feedback: "Strong interpretive work, especially on complementary skills.",
      },
      {
        key: "organization",
        label: "Organization",
        score: 16,
        max: 20,
        feedback: "Clear arc; the rebuttal paragraph could engage skeptics more directly.",
      },
      {
        key: "conventions",
        label: "Conventions",
        score: 19,
        max: 20,
        feedback: "Polished prose with effective rhetorical control.",
      },
    ],
    overallNote:
      "Well-argued with strong analysis; tighten citations and the rebuttal paragraph.",
  },
];

export const SUGGESTED_PROMPTS = [
  "Raise Thesis to 20 and explain why",
  "Show me where the evidence is uncited",
  "Apply a +2 curve to the batch",
  "Rewrite the thesis feedback to be kinder",
];
