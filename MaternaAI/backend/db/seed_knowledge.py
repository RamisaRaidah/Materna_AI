"""
Run this once to populate your RAG knowledge base.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from pgvector.psycopg2 import register_vector
import cohere
from config import DATABASE_URL, COHERE_API_KEY

co = cohere.Client(COHERE_API_KEY)

KNOWLEDGE_CHUNKS = [
    {
        "source": "WHO Maternal Health Guidelines",
        "category": "danger",
        "content": """Danger signs during pregnancy that require immediate medical attention:
1. Severe headache that does not go away, especially with visual disturbances or swelling.
2. Blurred vision or seeing spots, which may indicate preeclampsia.
3. Severe swelling of face, hands, or feet - sudden swelling is a warning sign.
4. Vaginal bleeding at any point during pregnancy.
5. Severe abdominal pain or cramping.
6. Baby not moving or reduced fetal movement after 28 weeks.
7. High fever above 38°C with chills.
8. Difficulty breathing or chest pain.
9. Fainting or loss of consciousness.
If any of these occur, the mother should go to a hospital or emergency facility immediately."""
    },
    {
        "source": "WHO Preeclampsia Guidelines",
        "category": "danger",
        "content": """Preeclampsia is a serious pregnancy complication characterized by high blood pressure 
and signs of damage to organs, most often the liver and kidneys. It usually begins after 20 weeks of pregnancy.
Symptoms include: protein in urine, severe headaches, changes in vision including blurriness, 
upper belly pain usually under the ribs on the right side, nausea or vomiting, decreased urine output,
decreased platelet levels in blood, impaired liver function, shortness of breath caused by fluid in the lungs.
Preeclampsia can be fatal if untreated. In Bangladesh it is one of the leading causes of maternal death.
Immediate hospitalization is required if preeclampsia is suspected."""
    },
    {
        "source": "WHO Nutrition During Pregnancy",
        "category": "nutrition",
        "content": """Key nutritional needs during pregnancy:
Iron: Pregnant women need 27mg of iron daily to prevent anemia. Good sources available in Bangladesh include
red meat, fish, lentils (dal), spinach, and fortified rice. Iron absorption increases when taken with vitamin C.
Folate/Folic Acid: 400-600 mcg daily, especially in first trimester, prevents neural tube defects.
Sources: green leafy vegetables, lentils, eggs, and fortified foods.
Calcium: 1000mg daily for bone development. Sources: milk, yogurt, small fish eaten with bones, dark green vegetables.
Protein: 70-100g daily for fetal growth. Sources: fish, eggs, lentils, chicken, dairy.
Avoid: raw fish, undercooked meat, excessive caffeine, alcohol."""
    },
    {
        "source": "UNICEF Bangladesh Nutrition Guidelines",
        "category": "nutrition",
        "content": """Nutrition recommendations for pregnant women in Bangladesh:
Common deficiencies in Bangladeshi pregnant women include iron, iodine, vitamin A, and zinc.
Recommended local foods: rice, lentils (masoor/moong dal), hilsa fish, eggs, green leafy vegetables 
like spinach and amaranth (shaak), pumpkin, sweet potato, jackfruit seeds, and seasonal fruits.
Iron deficiency anemia affects over 40% of pregnant women in Bangladesh.
Symptoms of anemia: fatigue, weakness, pale skin, shortness of breath.
Daily iron and folic acid supplements are recommended for all pregnant women in Bangladesh.
Iodized salt should be used for cooking to prevent iodine deficiency."""
    },
    {
        "source": "Postpartum Depression Clinical Guidelines",
        "category": "ppd",
        "content": """Postpartum depression (PPD) is a serious mental health condition that affects mothers 
after childbirth. It is NOT a sign of weakness or bad motherhood. It is a medical condition caused by 
hormonal changes, sleep deprivation, and emotional adjustment after birth.
Symptoms include: persistent sadness or emptiness, loss of interest in activities, difficulty bonding 
with the baby, withdrawal from family and friends, changes in appetite or sleep, intense irritability,
fear of not being a good mother, thoughts of harming oneself or the baby.
In Bangladesh, PPD is often misunderstood or dismissed. Cultural stigma prevents many women from seeking help.
PPD is treatable with counseling, support, and in some cases medication.
Risk factors: history of depression, lack of social support, difficult birth experience, financial stress."""
    },
    {
        "source": "Edinburgh Postnatal Depression Scale Guidelines",
        "category": "ppd",
        "content": """The Edinburgh Postnatal Depression Scale (EPDS) is a 10-question screening tool for PPD.
Scoring: 0-9 indicates low risk, 10-12 indicates possible depression, 13 or above indicates probable depression.
Question topics cover: ability to laugh, looking forward to things, blaming yourself, anxiety, fear, 
things getting on top of you, difficulty sleeping, feeling sad, crying, thoughts of self-harm.
The scale should be used as a starting point for conversation, not a definitive diagnosis.
Women scoring 10 or above should be referred to a healthcare professional for proper assessment."""
    },
    {
        "source": "WHO Antenatal Care Recommendations",
        "category": "general",
        "content": """WHO recommends at least 8 antenatal care visits during pregnancy:
- First visit: before 12 weeks (first trimester)
- Second visit: 20 weeks
- Third visit: 26 weeks
- Fourth visit: 30 weeks
- Fifth visit: 34 weeks
- Sixth visit: 36 weeks
- Seventh visit: 38 weeks
- Eighth visit: 40 weeks
Each visit should include blood pressure check, weight measurement, urine test, blood tests,
fetal heartbeat check, and counseling on nutrition, danger signs, and birth preparation.
In Bangladesh, many rural women have fewer visits due to access barriers."""
    },
    {
        "source": "WHO Perinatal Mental Health Guidelines",
        "category": "ppd",
        "content": """WHO Perinatal Mental Health - Key Facts:
Worldwide about 10% of pregnant women and 13% of women who have
just given birth experience a mental disorder, primarily depression.
In developing countries (including Bangladesh), rates are higher:
approximately 16% during pregnancy and 20% after childbirth.
About 20% of mothers in developing countries experience clinical
depression after childbirth.
Suicide is an important cause of death among pregnant and
postpartum women - accounting for approximately 20% of postpartum deaths.
Postpartum psychosis is less common but can lead to suicide and
in rare cases harming the newborn.
Depression causes enormous suffering and reduces a mother's response
to her child's needs. Treating maternal depression leads to improved
growth and development of the newborn and reduces likelihood of
diarrhea and malnutrition among infants.
Types of perinatal mental health disorders: depression, anxiety,
postpartum psychosis, post-traumatic stress disorder (PTSD),
obsessive-compulsive disorder (OCD), bipolar disorder."""
    },
    {
        "source": "WHO Maternal Mental Health - Bangladesh Context",
        "category": "ppd",
        "content": """Maternal mental health in low and middle income countries like Bangladesh:
Mental health disorders during pregnancy and postpartum are significantly
more common in low-income and middle-income countries (LMICs).
Access to mental health care is extremely limited - less than one
mental health worker per 100,000 population in low-income countries
(compared to about 1 per 2,000 in high-income countries).
Risk factors especially relevant in Bangladesh:
- Financial stress and poverty
- Lack of social support / isolation
- Domestic violence or gender-based violence
- Difficult or traumatic birth experience
- History of depression or mental illness
- Unplanned pregnancy
- Cultural stigma around mental health - many women are
  afraid to speak up or seek help
Untreated maternal mental health disorders can lead to:
- Preterm birth and low birth weight in babies
- Poor mother-infant bonding
- Delayed child development and behavioral issues
- Increased risk of malnutrition in infants
Early identification and treatment significantly improves
outcomes for both mother and child."""
    },
        {
                "source": "Bangladesh Maternal Nutrition Practices Study (PMC5503174)",
                "category": "nutrition",
                "content": """Study focus: maternal, household, and health service factors linked to
iron-folic acid (IFA) tablets, calcium tablets, and dietary diversity among
pregnant and recently delivered women in rural Bangladesh.

Key findings:
- Average intake was below guidelines: about 94 IFA tablets and 82 calcium tablets
    vs a 180-tablet recommendation for each.
- Only about 50% of pregnant women met minimum dietary diversity
    (at least 5 of 10 food groups).

Strong drivers of better nutrition:
- Maternal nutrition knowledge (strongest factor) and self-efficacy/social norms.
- Husband support (buying foods/supplements, reminders, monitoring weight gain).
- Early and frequent antenatal care visits.
- Receiving supplements for free.

Combined impact: with good knowledge, husband support, early ANC, and free
supplements, women consumed about 46 more IFA tablets, 53 more calcium tablets,
and dietary diversity increased by about 17%."""
        },
        {
                "source": "Bangladesh Maternal Nutrition Practices Study - Methods and Baseline (PMC5503174)",
                "category": "nutrition",
                "content": """Methods summary: factors were scored in tertiles for maternal knowledge,
beliefs/self-efficacy, husband support, and health service access. ANC timing
was grouped as early (<3 months), intermediate (3-6 months), and late (>6 months).
Analyses used descriptive, bivariate, multivariate regressions, and population
attributable risk. Models adjusted for age, education, parity, SES, and food security.

Baseline characteristics in rural Bangladesh:
- Mean age 24 years; adolescents were common (about 27% pregnant, 20% postpartum).
- Over 10% illiterate; over 80% did not finish high school.
- About two-thirds received medium to high husband support; <10% had supplement
    support from other family members.
- 45% had early ANC; about two-thirds completed at least 4 visits.
- 86% received frontline health worker home visits (avg 3.5).
- Free supplements were limited: about 38% for IFA and 27% for calcium.

Key insight: outreach was strong, but financial/logistical support for supplements
lagged, so most women still paid out of pocket."""
        },
    {
        "source": "Systematic Review of PPD Prevention Apps - Background and Methods",
        "category": "ppd",
        "content": """Background: Postpartum depression (PPD) develops within the first year
after birth and can include depressed mood, loss of interest, fatigue, and
suicidal thoughts lasting more than two weeks. Global prevalence ranges from
about 5% to 26.32% and is higher in developing nations. Barriers to care include
stigma, childcare duties, and limited time.

Rationale: Mobile health apps can deliver psychosocial interventions at home.
Prior evidence was mixed, and no earlier review focused only on apps designed
to prevent PPD with automated psychosocial interventions.

Methods: Systematic review and meta-analysis following PRISMA. Population was
pregnant women up to one year postpartum (excluding women already diagnosed with
depression or on antidepressants). Interventions were automated app-based
psychosocial programs (e.g., CBT, mindfulness, counseling, peer support) and
excluded basic human-only chat, SMS, or phone calls. Comparison was standard care.
Only randomized controlled trials were included. Searches were done in March 2020
and updated March 2023 across major databases.

Outcomes: Primary was clinical PPD onset (e.g., DSM-5 diagnosis). Secondary was
change in depression screening scores (EPDS, PHQ-9, CES-D). Random-effects models
were used with risk ratios for binary outcomes and standardized mean differences
for continuous outcomes. Final inclusion was 16 RCTs."""
    },
    {
        "source": "Systematic Review of PPD Prevention Apps - Results and Conclusions",
        "category": "ppd",
        "content": """Results: Only two studies measured clinical PPD onset. Pooled analysis
showed a trend toward prevention (risk ratio about 0.80) but was not statistically
significant. Twelve studies reporting EPDS scores showed significant symptom
reduction in intervention groups, though heterogeneity was high due to different
app designs (e.g., CBT, mindfulness, psychoeducation).

COVID-19 context: Maternal mental health worsened during the pandemic. PPD rates
rose to roughly 34% globally, up from baseline estimates around 21% to 26% in
low- and middle-income settings. With limited face-to-face care, automated apps
became a widely accessible option.

Limitations: Few trials measured formal clinical diagnosis, app formats varied,
and attrition was high due to dropouts.

Conclusion: Automated psychosocial apps consistently reduce PPD symptom scores
and show promise for prevention, but larger RCTs measuring formal diagnosis are
needed to confirm whether they prevent clinical PPD onset."""
    },
    {
        "source": "Bangladesh Pregnancy Screening Study - Background and Methods",
        "category": "general",
        "content": """Background: Non-communicable diseases are rising in low- and middle-income
countries. South Asia carries a large share of global diabetes and hypertension
burden. Hyperglycemia affects about 17% of pregnancies globally and raises
newborn death risk by 2.5 to 5 times. Hypertensive disorders complicate 5-10%
of pregnancies and account for about 16% of stillbirths. In Bangladesh, about
24% of maternal deaths are due to pre-eclampsia or eclampsia, and roughly 13%
of rural women develop gestational diabetes. National guidelines (2016) require
routine diabetes and hypertension screening during ANC, but rural coverage was
unclear.

Methods: Cross-sectional survey in Baliakandi sub-district (CHAMPS area), April
to August 2019. Participants were 4,692 married women who had a pregnancy
outcome in the prior 12 months. Data collectors conducted face-to-face interviews
using structured questionnaires adapted from DHS and WHO STEPwise tools and
translated into Bengali. Outcomes included self-reported screening and diagnosis
of diabetes/hypertension and receipt of key ANC services (BP checks, urine and
blood tests, height/weight, iron/calcium supplements, tetanus). Analyses used
chi-squared tests and multivariate logistic regression controlling for age,
education, wealth quintile, and gravidity."""
    },
    {
        "source": "Bangladesh Pregnancy Screening Study - Results and Conclusions",
        "category": "general",
        "content": """Results: Hypertension screening was near universal (97%); among those
screened, about 10% were diagnosed. Diabetes screening was low (46%); among those
screened, about 3% were diagnosed. Younger, less educated, and poorer women had
the lowest odds of diabetes screening. Women with post-secondary education were
over three times more likely to be screened for diabetes and about 2.5 times for
hypertension. Older age (30-39 years) was the strongest predictor of diagnosis
(about 8x for diabetes, 3x for hypertension). Wealth was linked to higher odds
of hypertension diagnosis but not diabetes.

ANC findings: Women with diagnoses had more visits and more testing, but they
were no more likely to receive all basic ANC elements than women without
diagnoses. Some diagnoses occurred after delivery (about 8% diabetes, 19%
hypertension), indicating missed detection during pregnancy.

Conclusion: Despite high contact with the health system, diabetes screening
lags far behind blood pressure checks and appears selective. Enforcing universal
screening during ANC and improving clinic compliance with national guidelines
are critical to reduce maternal and newborn risks."""
    },
    {
        "source": "Rural Bangladesh MHC Access Review - SEM Barriers and Facilitators",
        "category": "general",
        "content": """Synthesis using the Social-Ecological Model (SEM) for rural Bangladesh
maternal healthcare access.

Individual level barriers: low literacy, high parity, early marriage and
adolescent pregnancy, unintended pregnancy, limited knowledge about services,
misconceptions about complications, and beliefs that iron-folic acid tablets
cause large babies and costly delivery. Facilitators include higher education,
adult age, fewer prior births, employment or economic autonomy, and positive
experiences with supplements.

Interpersonal level barriers: low autonomy and delays in household decision
making, poor spousal communication about reproductive health, and intimate
partner violence. Facilitators include active husband and family support and
higher spouse education or stable employment.

Community level barriers: poverty, cultural taboos around early pregnancy and
facility delivery, influence of unqualified brokers, and disaster-prone areas
reducing ANC visits. Facilitators include higher household wealth, mass media
exposure, and NGO affiliation or microcredit networks.

Organizational level barriers: distance, poor roads and transport, out-of-pocket
costs and hidden fees, low-quality care and staff shortages, lack of female
providers, and limited phone ownership for mHealth. Facilitators include
proximity to facilities, free or subsidized services, mHealth access (even via
shared phones), and clean private facilities with privacy.

Recommendations: multi-level interventions that improve female and health
literacy, engage husbands, use media and NGOs to reduce taboos, upgrade roads,
expand free diagnostic services, and train providers in respectful maternity
care."""
    },
    {
        "source": "Rural Bangladesh MHC Access Review - Evidence Profile",
        "category": "general",
        "content": """Review scope: 37 papers (2001-2023), mostly 2011-2018; 24 quantitative,
10 qualitative, and 3 mixed-methods studies. Most were rural or mixed settings.
Quality was mostly high.

Key quantitative patterns: education is the strongest individual factor, with
large increases in ANC use and counseling; older age increases facility
deliveries; lack of self-confidence in clinical care is a newly noted barrier.
Family dynamics show decision bottlenecks from husbands and mothers-in-law, and
intimate partner violence reduces ANC use. Community influences include taboos
on pregnancy disclosure, isolation practices, and environmental barriers such as
distance, floods, and poor roads. NGO and media exposure consistently increase
service use.

Institutional insights: public clinics remove cost barriers but often have
diagnostic shortages, provider rudeness, and lack of female staff. Private
facilities provide better privacy and cleanliness but are expensive. Hidden
investigation fees can push families into out-of-pocket spending even when
baseline care is free.

Policy focus: universal screening adherence, expanded free diagnostics, provider
soft-skill training, and climate-resilient access via roads and mHealth."""
    },
    {
        "source": "WHO Maternal Health Reference Guide - Nutrition and Micronutrients",
        "category": "nutrition",
        "content": """Nutrition and activity: healthy diet with adequate energy, protein,
vitamins, and minerals from diverse foods. Exercise should be low-impact
and woman-centered; avoid peak fitness training or high risk activities.

Gestational weight gain targets by pre-pregnancy BMI (IOM):
- Underweight (<18.5): 12.5-18.0 kg
- Normal (18.5-24.9): 11.5-16.0 kg
- Overweight (25.0-29.9): 7.0-11.5 kg
- Obese (>=30.0): 5.0-9.0 kg

Undernutrition settings (adult underweight prevalence >=20%): use MUAC to
identify protein-energy malnutrition. Nutrition education and balanced energy
protein supplementation are recommended for high-prevalence settings, with
quality assurance and supply planning. High-protein supplementation is not
recommended for maternal or perinatal outcomes.

Iron and folic acid (IFA): daily 30-60 mg elemental iron plus 400 mcg folic
acid to prevent anemia and adverse outcomes. Intermittent IFA (120 mg iron +
2.8 mg folic acid weekly) only where anemia prevalence is <20% and daily
intake is not tolerated; requires confirmed absence of anemia. If anemia is
diagnosed (Hb <110 g/L), use therapeutic dosing: 120 mg iron + 400 mcg folic
acid daily until Hb >=110 g/L.

Vitamin A: only in settings with severe deficiency (>=5% night blindness or
>=20% serum retinol <0.70 umol/L). Limit to 10,000 IU daily or 25,000 IU
weekly; avoid single doses >25,000 IU due to teratogenic risk.

Not recommended routinely: zinc (research only), vitamin B6, vitamins E and C
for maternal or perinatal outcomes."""
    },
    {
        "source": "WHO Maternal Health Reference Guide - Screening and Ultrasound",
        "category": "general",
        "content": """Anemia screening: full blood count preferred; use a hemoglobinometer
in low-resource settings; hemoglobin color scale only if no other options.

Asymptomatic bacteriuria: midstream urine culture preferred; if unavailable,
midstream Gram stain is better than dipstick. Treat with a 7-day antibiotic
course. Group B strep bacteriuria indicates heavy colonization and requires
intrapartum antibiotics during labor.

Fetal movement: routine daily counting is recommended only in research, but
clinicians should ask about perceived movement at each ANC visit; reduced
movement needs evaluation. Fetal growth assessment: do not replace abdominal
palpation with symphysis-fundal height if it disrupts local practice.

Ultrasound: one scan before 24 weeks improves gestational age accuracy and
detects anomalies or multiples. Late scan (>24 weeks) is not recommended if an
early scan was done; if no early scan, late ultrasound is limited to fetal
number, presentation, and placental location. Routine Doppler for healthy
pregnancies is not recommended."""
    },
    {
        "source": "WHO Maternal Health Reference Guide - Prophylaxis and Restrictions",
        "category": "general",
        "content": """Caffeine: advise reduction for women consuming >300 mg/day to reduce
pregnancy loss and low birth weight risk. Typical amounts: brewed coffee can
exceed 150 mg per serving; instant coffee about 60 mg per cup; teas and colas
often <50 mg per 250 mL.

Anthelminthic treatment: after first trimester in endemic areas where soil
transmitted helminth prevalence is >=20% and anemia prevalence is >=40%. Use a
single oral dose of albendazole 400 mg or mebendazole 500 mg; twice yearly if
prevalence >=50%, once yearly if 20-50%.

Malaria IPTp-SP: for pregnant women in moderate to high malaria areas (Africa).
Start at 13 weeks, doses at least 1 month apart, minimum 3 doses. High-dose
folic acid (>=5 mg daily) reduces SP efficacy; limit antenatal folic acid to
0.4 mg daily when IPTp-SP is used.

Anti-D immunoglobulin: antenatal prophylaxis at 28 and 34 weeks is recommended
only in research for non-sensitized Rh-negative women; postpartum anti-D is
supported by high-certainty evidence.

High-protein supplementation, routine Doppler, and certain micronutrient
supplements (B6, E, C) are not recommended outside research contexts."""
    },
    {
        "source": "WHO Intrapartum Care - Models and Labor Definitions",
        "category": "general",
        "content": """Midwife-led continuity of care (MLCC): recommended only where midwifery
programs are well functioning. If midwifery capacity is limited, prioritize
scaling and quality before shifting to MLCC. Caseloads must be balanced to
prevent burnout; alternative continuity models may be needed when resources are
constrained.

First stage definitions: latent phase involves painful contractions with slow
progress up to 5 cm. Active phase begins at 5 cm and continues to 10 cm with
more rapid dilation. Latent phase duration should not drive decisions.

Expected active phase duration: median about 4 hours for nulliparous and 3 hours
for multiparous women. Upper limits should not exceed 12 hours (nulliparous) or
10 hours (multiparous).

Clinical directive: in healthy spontaneous labor, do not intervene to shorten
labor if maternal and fetal status is reassuring and progress is acceptable."""
    },
    {
        "source": "WHO Intrapartum Care - Avoiding Unnecessary Interventions",
        "category": "general",
        "content": """The 1 cm/hour dilation rule is not a routine indication for intervention.
The partograph alert line should not be used to identify risk in healthy labor;
it may be used only for referral triage in remote settings and should start at
5 cm. Medical acceleration (oxytocin augmentation or cesarean) before 5 cm is
not recommended if mother and fetus are stable. Before diagnosing delay, assess
for cephalo-pelvic disproportion and ensure physical and emotional needs are met.

Admission interventions not recommended for low-risk women: routine clinical
pelvimetry, routine perineal or pubic shaving before vaginal birth, and routine
enemas. These do not improve outcomes and can increase harm or discomfort."""
    },
    {
        "source": "WHO Intrapartum Care - Assessments and Fetal Monitoring",
        "category": "general",
        "content": """Vaginal examination: routine digital exams every 4 hours in active labor;
limit frequency to reduce infection risk, especially with prolonged rupture of
membranes. Avoid multiple examinations by different providers in teaching
settings.

Fetal heart rate (FHR): routine admission CTG and continuous CTG are not
recommended for healthy, low-risk spontaneous labor. Intermittent auscultation
using Pinard or handheld Doppler is preferred: every 15-30 minutes in active
first stage and every 5 minutes in second stage. Each check should last at least
1 minute; if FHR is outside 110-160 bpm, continue across at least three
contractions. Document baseline FHR and note accelerations or decelerations.
Ensure battery and power plans before switching to Doppler units."""
    },
    {
        "source": "WHO Intrapartum Care - Early Admission and Facility Support",
        "category": "general",
        "content": """Delaying admission until active labor is recommended only in research.
Unless a woman prefers to stay home, admit on presentation and complete maternal
and fetal assessment. For latent labor admissions, avoid acceleration and ensure
clean waiting areas, space to walk, toilets, food, and water. Facility
reorganization options include on-site midwife-led birthing units or alongside
midwifery units to support low-intervention care."""
    },
    {
        "source": "WHO Intrapartum Care - Supportive Care and Comfort",
        "category": "general",
        "content": """Avoid routine interventions to prevent delay: routine pain relief for
delay prevention, routine vaginal cleansing with chlorhexidine, active
management of labor packages, amniotomy alone, early amniotomy with early
oxytocin, prophylactic oxytocin with epidural, antispasmodic agents, and routine
IV fluids are not recommended for low-risk women.

Comfort and mobility: allow oral fluids and food in low-risk labor. Encourage
mobility and upright positions during the first stage to improve outcomes and
reduce cesarean rates."""
    },
    {
        "source": "WHO Intrapartum Care - Pain Management",
        "category": "general",
        "content": """Discuss pain relief options during ANC. Epidural analgesia is
recommended when requested and resources allow; use the lowest effective local
anesthetic dose to preserve motor function. With epidural, support preferred
positions and consider delayed pushing (1 to 2 hours) if monitoring capacity
permits.

Parenteral opioids may be used by preference with counseling on drowsiness,
nausea, and neonatal respiratory depression risk. Short-acting opioids (e.g.,
fentanyl) are preferred; avoid routine pethidine. Prioritize non-opioid methods
for women with opioid addiction history. Ensure secure storage and trained staff.

Non-pharmacological options (relaxation, breathing, music, mindfulness, massage,
warm packs, water immersion, hypnobirthing, acupuncture) are safe and may improve
experience, but evidence for direct clinical benefit is low certainty."""
    },
    {
        "source": "WHO Intrapartum Care - Second Stage and Perineal Care",
        "category": "general",
        "content": """Second stage: usually within 3 hours for nulliparous and 2 hours for
multiparous women. Do not intervene based on time alone if maternal and fetal
status is reassuring and descent is progressing. Avoid transferring women to a
different room at the start of second stage if labor is normal.

Pushing and positioning: support the woman's preferred position (including
upright) and spontaneous pushing; avoid directed pushing. Upright positions may
reduce instrumental delivery and episiotomy but slightly increase second-degree
tears or PPH risk.

Perineal care: routine episiotomy is not recommended. If indicated, obtain
consent, use local anesthesia, and prefer mediolateral technique. Use continuous
suturing; routine prophylactic antibiotics are not needed. Perineal massage,
warm compresses, and gentle guarding can reduce tearing. Ritgen maneuver and
fundal pressure are not recommended."""
    },
    {
        "source": "WHO Intrapartum Care - Third Stage and PPH Prevention",
        "category": "general",
        "content": """PPH prevention: give uterotonics for all births. First-line is oxytocin
10 IU IM or IV. Alternatives include ergometrine or oxytocin-ergometrine
combination if oxytocin unavailable; avoid ergot derivatives in hypertensive
women. Oral misoprostol 600 mcg is an alternative when injectables are not
available; higher doses increase side effects and should be avoided.

Objective blood loss measurement is recommended for all births: use calibrated
drapes for vaginal birth and volumetric measurement for cesarean. Monitor for
tachycardia and hypotension. Measurement must link to a standardized PPH
response protocol to improve outcomes."""
    },
    {
        "source": "Newborn Care - Essential Practices",
        "category": "general",
        "content": """Essential newborn care for all babies:
- Immediate skin-to-skin contact and keep the baby warm.
- Start breastfeeding within 1 hour of birth and feed on demand.
- Exclusive breastfeeding for 6 months; no water or other foods.
- Keep the cord clean and dry; avoid applying substances.
- Delay bathing for at least 24 hours to reduce hypothermia risk.
- Ensure the baby passes urine and stool within the first day.

Newborn danger signs needing urgent care:
- Poor feeding or unable to feed, very sleepy or hard to wake.
- Fever, low temperature, or fast breathing (about 60/min or more).
- Severe chest indrawing, grunting, or blue lips.
- Convulsions or unusual movements.
- Yellow skin in the first 24 hours or deep yellowing of eyes/skin.
- Redness or pus around the umbilical stump."""
    },
    {
        "source": "Postpartum Care - Maternal Danger Signs",
        "category": "general",
        "content": """Postpartum warning signs that need urgent care:
- Heavy bleeding (soaking a pad in an hour or passing large clots).
- Foul-smelling vaginal discharge or high fever.
- Severe headache, vision changes, or seizures.
- Chest pain, shortness of breath, or fainting.
- Severe abdominal pain or swelling.
- Painful, red, swollen leg (possible clot).

Postpartum basics: rest, hydration, balanced diet, early walking as able, and
follow-up visits. Seek help early for mood changes or overwhelming sadness."""
    },
    {
        "source": "Family Planning and Birth Spacing - Global Guidance",
        "category": "general",
        "content": """Healthy spacing: waiting at least 24 months after a live birth before
the next pregnancy reduces risks for mother and baby.

Postpartum options include:
- Lactational amenorrhea method (LAM): effective only if baby is <6 months,
  exclusive breastfeeding day and night, and no return of menses.
- Condoms and other barrier methods.
- Progestin-only pills, injectables, implants, or IUDs when clinically
  appropriate.

Choice should be based on personal preference, health status, and access.
Counseling should include dual protection for STI prevention when needed."""
    },
    {
        "source": "Gestational Diabetes - Basic Management",
        "category": "general",
        "content": """Gestational diabetes (GDM) is high blood sugar first recognized in
pregnancy. Screening commonly occurs at 24-28 weeks with glucose testing.

Core management:
- Nutrition counseling with balanced meals and regular activity.
- Home glucose monitoring when available.
- If targets are not met, medication such as insulin may be needed.

After delivery, glucose usually improves, but re-testing at about 6-12 weeks
postpartum is advised to check for persistent diabetes risk."""
    },
    {
        "source": "Hypertension and Preeclampsia - Basic Management",
        "category": "danger",
        "content": """Hypertensive disorders can start after 20 weeks. Warning signs include
severe headache, vision changes, upper abdominal pain, swelling of face/hands,
and very high blood pressure.

Management basics:
- Regular blood pressure monitoring during ANC.
- Treat severe hypertension promptly with appropriate antihypertensives.
- For severe preeclampsia/eclampsia risk, magnesium sulfate reduces seizures.
- Delivery is the definitive treatment when risks outweigh benefits.

Any signs of severe disease require urgent referral."""
    },
    {
        "source": "Infection Prevention - UTI and Sepsis Warning Signs",
        "category": "general",
        "content": """UTI in pregnancy: burning urination, urgency, lower abdominal pain, or
fever. Asymptomatic bacteriuria can be present without symptoms and should be
treated when detected.

Maternal sepsis warning signs:
- Fever or low temperature, rapid breathing, fast heart rate.
- Severe weakness, confusion, or reduced urine output.
- Severe abdominal or pelvic pain.

Urgent evaluation is needed if sepsis is suspected."""
    },
    {
        "source": "Postpartum Nutrition and Lactation",
        "category": "nutrition",
        "content": """After birth, mothers need a balanced diet with adequate calories,
protein, and fluids to support recovery and breastfeeding. Frequent meals and
safe fluids are recommended. Continue iron and folic acid if advised, especially
after blood loss or anemia. Limit alcohol and avoid smoking or secondhand smoke.
Seek help if weight loss is rapid or appetite is very poor."""
    },
    {
        "source": "Maternal Mental Health - Global Support Guidance",
        "category": "ppd",
        "content": """Postpartum mood changes are common, but persistent sadness, anxiety,
or inability to care for self or baby needs support. Warning signs include
thoughts of self-harm or harming the baby.

Support options: talk with a trusted family member, community health worker,
or clinician; counseling and peer support can help. In emergencies or if there
are self-harm thoughts, urgent care is needed."""
    },
    {
        "source": "Vaccines in Pregnancy - Global Guidance",
        "category": "general",
        "content": """Vaccination guidance varies by country, but commonly recommended:
- Tetanus-containing vaccine to protect mother and newborn.
- Influenza vaccine during any trimester to reduce severe flu risk.

Some settings recommend Tdap during each pregnancy to protect against pertussis.
Always follow national schedules and consult ANC providers for timing."""
    },
    {
        "source": "Bangladesh ANC and PNC Schedule - DGHS",
        "category": "general",
        "content": """ANC schedule (Bangladesh adaptation of 8 contacts):
- ANC 1: within 12 weeks. Baseline BP, weight, confirmation, start IFA.
- ANC 2: 20 weeks. Quickening assessment, advise structural scan if indicated.
- ANC 3: 26 weeks. Td dose 1 if not vaccinated.
- ANC 4: 30 weeks. Preeclampsia evaluation, fundal height check.
- ANC 5: 34 weeks. Fetal growth check, Td dose 2 tracking.
- ANC 6: 36 weeks. Birth plan finalized (facility, donor, transport).
- ANC 7: 38 weeks. Malpresentation check, risk assessment.
- ANC 8: 40 weeks. Post-date management plan.

PNC schedule (priority):
- PNC 1: within 24 hours of delivery.
- PNC 2: day 3 (72 hours).
- PNC 3: day 7 to 14.
- PNC 4: day 42 (6 weeks)."""
    },
    {
        "source": "Bangladesh EPI Schedule - Pregnancy and Infant",
        "category": "general",
        "content": """Maternal Td schedule:
If not previously vaccinated, a 5-dose series is used.
- Td1: early pregnancy (15+ weeks or as early as possible).
- Td2: 4 weeks after Td1.
- Td3: 6 months after Td2.
- Td4: 1 year after Td3.
- Td5: 1 year after Td4.

Infant EPI schedule (Bangladesh):
- At birth (within 14 days): BCG (left upper arm, intradermal).
- 6, 10, 14 weeks: Pentavalent (DTP-HepB-Hib) IM, OPV oral, PCV IM, Rotavirus oral.
- 9 months and 15 months: MR (Measles-Rubella) doses."""
    },
    {
        "source": "Bangladesh Referral Pathways - Levels of Care",
        "category": "general",
        "content": """Referral pathway (typical rural):
Community Clinic or Satellite Clinic (CHCP/HA/FWA)
-> Union Health and Family Welfare Centre (UHFWC) for basic EmONC
-> Upazila Health Complex (UHC) for comprehensive EmONC and blood storage
-> District Hospital or MCWC
-> Medical College Hospital for tertiary care."""
    },
    {
        "source": "Bangladesh Menstrual Regulation (MR) Framework",
        "category": "general",
        "content": """Abortion is restricted except to save the mother, but MR is permitted
as a family planning service.

Medication MR: up to 9 weeks (63 days) from LMP, provided by trained midwives,
FWVs, or doctors.

Manual vacuum aspiration (MVA):
- Up to 10 weeks (70 days) by FWV or paramedic.
- Up to 12 weeks (84 days) by a certified medical doctor.

MR services have been authorized under the government family planning program
since 1979."""
    },
    {
        "source": "Bangladesh IFA and Calcium Dosage - Public Guidance",
        "category": "nutrition",
        "content": """Iron-folic acid (IFA): 60 mg elemental iron + 400 mcg folic acid daily
throughout pregnancy and continue up to 3 months postpartum.

Calcium: 1.0 to 1.5 g daily in two divided doses, taken separately from IFA to
avoid absorption conflicts. Supplements are provided through public facilities."""
    },
    {
        "source": "Bangladesh Maternal and Newborn Danger Signs - DGHS/IMCI",
        "category": "danger",
        "content": """Maternal danger signs:
- Severe headache with blurred vision.
- Fits or convulsions.
- Severe vaginal bleeding during pregnancy or after delivery.
- Foul-smelling discharge with high fever.
- Prolonged labor over 12 hours.

Newborn danger signs:
- Convulsions.
- Fast breathing (60 breaths per minute or more).
- Severe chest indrawing.
- No movement or only moves when stimulated.
- Unable to feed or suck.
- Temperature over 37.5 C or below 35.5 C."""
    },
    {
        "source": "Bangladesh Health Hotlines and Support",
        "category": "general",
        "content": """Shasthya Batayan: 16263 (24/7 tele-health support).
National hotline: 333 (follow prompts for health and emergency services).
These numbers connect to local guidance and referral support."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Physiological Maternal Assessment",
        "category": "general",
        "content": """A.1 Maternal Assessment - Physiological Assessment of the Woman (Recommendation 1):
First 24 Hours: All postpartum women require regular routine assessments of vaginal bleeding, uterine tonus, fundal height, temperature, and heart rate (pulse), beginning within the first hour after birth.
Blood Pressure: Measured shortly after birth. If normal, a second measurement must be taken within 6 hours.
Urine Void: Must be documented within 6 hours.
Beyond 24 Hours (Subsequent Contacts): Inquiries must continue regarding general well-being. Assessments must cover: micturition (urination) and urinary incontinence, bowel function, healing of any perineal wound, headache, fatigue, back pain, perineal pain, perineal hygiene, breast pain, uterine tenderness, and lochia (postpartum vaginal discharge).
Remarks: Postpartum abdominal uterine tonus assessment is recommended for all women for early identification of uterine atony."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - HIV Catch-Up Testing",
        "category": "general",
        "content": """A.1.2 HIV Catch-Up Testing (Recommendation 2a & 2b):
In high HIV burden settings (>=5% HIV prevalence), catch-up postpartum HIV testing is needed for women of HIV-negative or unknown status who missed early antenatal contact testing or third-trimester retesting.
In low HIV burden settings (<5% HIV prevalence), catch-up testing can be considered for women of HIV-negative or unknown status who missed antenatal testing or third-trimester retesting. This is limited to women in serodiscordant relationships (partner not virally suppressed on ART) or those with other known ongoing HIV risks.
Remarks: Retesting at 14 weeks, 6 months, or 9 months postpartum could be encouraged in high-burden settings. ART initiation should be offered to all women with confirmed HIV diagnosis. HIV-exposed infants should receive early virological testing."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Tuberculosis (TB) Screening",
        "category": "general",
        "content": """A.1.3 Screening for Tuberculosis (TB) Disease (Recommendation 3a, 3b, 3c):
Recommendation 3a: Systematic screening for TB disease may be conducted among the general population, including postpartum women, in areas with estimated TB prevalence of 0.5% or higher.
Recommendation 3b: In settings where general population TB prevalence is 100/100,000 or higher, systematic screening may be conducted among postpartum women.
Recommendation 3c: Household contacts and close contacts of individuals with TB disease—including postpartum women and newborns—should be systematically screened.
Remarks: Postpartum TB screening may be conducted in subpopulations with structural risk factors (urban poor, homeless, remote communities, refugees, etc.). Any newborn with close contact to a TB patient must be screened via symptom screen and/or chest radiograph."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Common Physiological Signs and Symptoms",
        "category": "general",
        "content": """A.2 Interventions for Common Physiological Signs and Symptoms:
Perineal and Uterine Cramping/Involution Pain: Perineal pain impairs mobility, newborn care, and breastfeeding. Non-pharmacological cooling options: solid/crushed ice, gel packs, or bathing. Pharmacological options: paracetamol, aspirin, oral NSAIDs. Uterine involution causes cramping for 2–3 days, treated with paracetamol, NSAIDs, and/or codeine.
Urinary and Fecal Incontinence: Roughly one-third of women experience involuntary urinary leakage in the first 3 months postpartum. Pelvic Floor Muscle Training (PFMT)—daily sets of repeated voluntary contractions several days a week—is used to prevent/treat it.
Breast Engorgement: Pathological overfilling of the breasts with milk (hard, painful, tight breasts), affecting 15% to 50% of women. Methods: moist heat before feeding, frequent feeding, correct positioning/attachment, expressing/pumping, massage, cold compresses. Can be paired with paracetamol or ibuprofen. Pharmacological: oxytocin or enzyme therapy."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Values, Acceptability, Feasibility",
        "category": "general",
        "content": """WHO Postnatal Care Guidelines Summary Boxes:
Values (Box 3.1): Women desire a positive experience where they can build confidence as a mother, adjust to relationships, and navigate challenges. They want info on soothing injuries and to discuss their birth experience. Breastfeeding is highly valued for bonding, but challenges cause distress.
Acceptability (Box 3.2): Women appreciate techniques enhancing comfort, mobility, sexual relations, and psychosocial well-being. Antenatal info about complications is highly valued.
Feasibility (Box 3.3): Lack of personnel, resources, and training may limit delivery of treatments, info, and counseling. In LMICs, women may avoid seeking help if they believe treatments will incur extra costs or facilities lack resources."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Local Cooling for Perineal Pain",
        "category": "general",
        "content": """A.2.1 Local Cooling for Perineal Pain Relief (Recommendation 4):
Local cooling, such as with ice packs or cold pads, can be offered to women in the immediate postpartum period to relieve acute pain from childbirth-related perineal trauma, based on the woman's preferences and available options.
Remarks: Involves intermittent applications of crushed ice (between pad layers) or gel packs for 10 to 20 minutes within the first 48 hours postpartum. Pain relief must be individualized. Local cooling is low-cost and safe. Health workers must ask about perineal pain at every contact and educate on danger signs (worsening pain signaling hematomas, hemorrhoids, or infection)."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Local Cooling Evidence & Considerations",
        "category": "general",
        "content": """WHO Postnatal Care Guidelines - Local Cooling Evidence & Considerations:
Effects of Interventions: Evidence from Cochrane review focused on local cooling for non-severe perineal trauma (episiotomy, 1st-degree, or 2nd-degree tears). Excluded 3rd- or 4th-degree tears and intact perineums.
Trial Data: 10 trials (1,258 women total) in hospital settings (Brazil, UK, Iran, Thailand, Turkey).
Comparisons: Evaluates two main comparisons:
1. Perineal local cooling compared with no pain relief or usual care.
2. Perineal local cooling compared with other forms of non-pharmacological perineal pain relief."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Perineal Local Cooling Comparison 1",
        "category": "general",
        "content": """A.2.1 Local Cooling - Comparison 1: Perineal Local Cooling vs. No Pain Relief or Usual Care:
- Based on 5 trials (744 women) evaluating ice packs or cold gel packs vs no intervention, usual care, or generic maternity pads.
- Pain Relief: Uncertain if it reduces overall pain at 4–6, <24, or 24–48 hours postpartum, or moderate-to-severe pain within 24 hours (very low-certainty). Low-certainty evidence suggests it may reduce moderate-to-severe pain at 24–48 hours (1 trial, 316 women; RR 0.73, 95% CI 0.57 to 0.94; caution due to 29.8% attrition).
- Edema & Bruising: Low-certainty suggests little/no difference within 24 hours; effects at 24–48 hours are uncertain.
- Functioning: Low-certainty indicates little/no difference in pain associated with sitting or walking at 24 and 24–48 hours. Pain during feeding baby is uncertain.
- Satisfaction: Low-certainty indicates little/no difference to overall satisfaction with perineal care at day 10.
- Adverse Effects: No adverse events (like cold burns) reported. Breastmilk provision rates at 24–48 hours are uncertain."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Perineal Local Cooling Comparison 2 (Other Methods)",
        "category": "general",
        "content": """A.2.1 Local Cooling - Comparison 2: Perineal Local Cooling vs. Other Non-Pharmacological Methods:
- Comparison 2a (Cold Gel Pads + Compression vs. Uncooled Gel Pads + Compression): 1 trial, 250 primiparous women. Pain relief at 4-6h is uncertain. Low-certainty suggests cold gel pads + compression may reduce pain (MD 0.43 lower, 95% CI 0.73 to 0.13 lower) and perineal edema (MD 0.15 lower, 95% CI 0.28 to 0.03 lower) at 24–48 hours. May increase satisfaction (MD 0.88 higher).
- Comparison 2b (Ice Packs vs. Room-Temperature Water Packs): 1 trial, 63 women. Pain, edema, and additional analgesia needs are uncertain. Low-certainty suggests ice packs make little/no difference to satisfaction (RR 0.91), willingness to repeat (RR 0.88) or recommend (RR 0.89). No adverse effects. Little/no difference to breastfeeding rates at 48 hours.
- Comparison 2c (Ice Packs vs. Cold Gel Pads): 3 trials. Pain, redness, edema, bruising, discharge, wound gaping, satisfaction, and adverse effects are highly uncertain (very low-certainty)."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Local Cooling Judgements & Oral Analgesia Intro",
        "category": "general",
        "content": """WHO Postnatal Care Guidelines - Local Cooling Judgements & Oral Analgesia Intro:
- Trauma Subgroups: Unknown if cooling effects differ between episiotomies and tears.
- Resources & Equity: Highly affordable but requires clean water, electricity, refrigeration, and cold storage. Lack of these in low-resource settings may worsen health inequity.
- Judgements: VS. No Pain Relief: Desirable effects: Trivial, Undesirable: Don't know, Certainty: Very Low, Values: No important variability, Cost: Negligible, Acceptability: Probably yes. VS. Other Non-Pharmacological: Desirable: Small.
- A.2.2 Oral Analgesia - Recommendation 5 (Recommended): Oral paracetamol is recommended as the first-line choice when oral analgesia is required for postpartum perineal pain.
- Remarks: Individualize using the lowest effective dose. Single-dose paracetamol in early postpartum carries negligible risk to the newborn (minimal breastmilk excretion). Aspirin is strictly contraindicated during breastfeeding due to potential salicylate harm. Counsel on danger signs (escalating pain signaling hematomas, infection, or hemorrhoids)."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Oral Analgesia Evidence & Comparisons (Paracetamol & Aspirin)",
        "category": "general",
        "content": """WHO Postnatal Care Guidelines - Oral Analgesia Evidence Base & Comparisons:
- Evidence: Three Cochrane reviews of single-dose treatments for episiotomies/repaired tears. Paracetamol: 10 trials (1,367 women), 500-650 mg vs 1,000 mg vs placebo. Aspirin: 17 trials (1,132 women), 500-1,200 mg vs placebo (breastfeeding women excluded). NSAIDs: 28 trials (4,181 women) of 13 NSAIDs (breastfeeding women excluded).
- Comparison 1a: Single-Dose Paracetamol vs. Placebo: 500–650 mg: Pain relief is uncertain. 1000 mg: Low-certainty evidence suggests it may provide adequate pain relief (RR 2.42, 95% CI 1.53 to 3.81). Paracetamol reduces rescue analgesia needs (RR 0.34). Little/no effect on nausea (RR 0.18) or sleepiness (RR 0.89).
- Comparison 1b: Single-Dose Aspirin vs. Placebo: Low-certainty suggests it may provide adequate pain relief (RR 2.03, 95% CI 1.69 to 2.42), specifically at 500–650 mg (RR 1.98). 300, 900, 1200 mg are uncertain. Reduces rescue analgesia at 4–8 hours (RR 0.25). Total risk of adverse effects is uncertain."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Oral Analgesia NSAIDs vs Placebo",
        "category": "general",
        "content": """WHO Postnatal Care Guidelines - Comparison 1c: Single-Dose NSAID vs. Placebo:
- Symptom Relief at 4 Hours: Uncertain overall. Subgroups: Diclofenac 100 mg (RR 2.36) and Meclofenamate sodium 100 mg & 200 mg (RR 1.42) may provide adequate relief (low certainty). Ibuprofen, Ketoprofen, Diflunisal, Flurbiprofen are uncertain.
- Symptom Relief at 6 Hours: Low-certainty suggests single-dose NSAID may provide adequate pain relief (RR 1.92, 95% CI 1.69 to 2.17). Successful: Ibuprofen 300–400 mg (RR 2.08), Meclofenamate sodium 100 mg (RR 1.36) & 200 mg (RR 1.40), Dipyrone 500 mg (RR 2.21). Others are uncertain.
- Health Service Use (Rescue Relief): Low-certainty shows NSAIDs reduce rescue relief needs at 4 hours (RR 0.39), driven by Ibuprofen 300–400 mg (RR 0.32). At 6 hours, reduction is uncertain overall, but specific subgroups showed reduction: Ibuprofen 300–400 mg (RR 0.33), Meclofenamate sodium 100 mg (RR 0.34) & 200 mg (RR 0.45), Flurbiprofen 25/50/100 mg (all RR <= 0.06).
- Adverse Effects: Uncertain at 4 hours. Low-certainty suggests single-dose NSAID makes little/no difference to adverse effects at 6 hours."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Uterine Cramping Pharmacological Treatments",
        "category": "general",
        "content": """Postpartum pain from uterine cramping and involution (uterus shrinking back to normal size) - Pharmacological Stack:
1. Drug Classes vs. Placebo:
- NSAIDs (e.g., Ibuprofen, Aspirin): Evidence strongly leans toward NSAIDs. Low-certainty evidence shows they may provide adequate pain relief compared to placebo (RR 1.66). Aspirin 650 mg showed a clear benefit (RR 1.33). Relief from naproxen, flurbiprofen, ketorolac, and fenoprofen remains uncertain.
- Paracetamol: Uncertain whether a single oral dose of paracetamol provides better pain relief than a placebo.
- Opioids (e.g., Codeine): Uncertain if opioids provide adequate pain relief or affect the need for additional pain meds compared to a placebo.
2. Head-to-Head Comparisons:
- Higher vs. Lower Doses: Uncertain if changing dosage makes a difference for Naproxen (300 mg vs 600 mg), Ketorolac (5 mg vs 10 mg), or Codeine (60 mg vs 120 mg).
- NSAIDs vs. Opioids: Low-certainty suggests NSAIDs may provide better pain relief for uterine cramping than opioids (RR 1.33); specific matchups (Aspirin vs. Codeine, Naproxen vs. Codeine) remain uncertain.
- NSAIDs vs. Herbal Analgesia: Moderate-certainty suggests similar level of adequate pain relief (RR 0.96); specific pairs (ibuprofen vs fennel essence, mefenamic acid vs melissa officinalis) are uncertain.
- Paracetamol vs. NSAIDs: Uncertain if paracetamol (650 mg) provides adequate pain relief or alters side effects compared to aspirin (650 mg) or naproxen (500 mg)."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Uterine Cramping Practical Considerations & Safety",
        "category": "general",
        "content": """Uterine cramping pharmacological treatments - Costs, Equity, Feasibility, & Safety:
3. Practical Considerations:
- Paracetamol: Negligible cost (approx. US$ 0.004/tablet). Highly feasible/widely available OTC. Listed on WHO Essential Medicines. Varies equity impact: increases equity due to low cost, but can decrease it if women pay out-of-pocket.
- NSAIDs: Negligible cost (Aspirin: US$ 0.005, Ibuprofen: US$ 0.01). Highly feasible. Only Aspirin/Ibuprofen on WHO Essential Medicines. Equity varies (out-of-pocket dependency).
- Opioids: Moderate cost (Codeine: US$ 0.09, Nalbuphine: US$ 1.44/ml). Feasibility varies (requires prescription, specialized training, secure storage). Probably reduced equity: expensive alternatives are used in high-resource settings, widening care gaps.
4. Safety & Breastfeeding:
- Data Scarcity: Almost all trials did not report breastfeeding status or newborn adverse effects (8 trials excluded breastfeeding women entirely).
- Paracetamol Safety: Broadly considered safe/compatible with breastfeeding by AAP. Infant exposure is <2% of maternal dose. Only a single case of infant trunk rash described.
- Perceptions: Women may decline meds due to fear of passing chemicals through breastmilk. Clear safety info, correct single-dose usage, and avoiding accidental overdose are vital."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Breast Engorgement Non-Pharmacological Interventions",
        "category": "general",
        "content": """WHO Postnatal Care Guidelines - Non-Pharmacological Interventions for Postpartum Breast Engorgement:
- Cold Cabbage Leaves vs. Usual Care: Moderate-certainty shows a moderate desirable effect (overall balance favors cabbage leaves). Negligible cost (~US$ 0.50–1.30 per head). Feasibility varies (requires clean water to wash, kitchen tools to prepare, and refrigeration). Acceptability probably yes. Time commitment is high (apply for 2–8 hours, replace every 2 hours).
- Cold Gel Packs vs. Usual Care: Low-to-moderate certainty shows a small desirable effect. May make little/no difference in breast pain or satisfaction, but moderate-certainty suggests they probably reduce breast hardness. Moderate costs (~US$ 20.00 per two reusable packs). Feasibility limited in low-income settings (refrigeration/electricity needed). Decreases equity.
- Warm Herbal Compresses vs. Usual Care: Low-to-moderate certainty shows small desirable effect. Hot herbal compress balls (Cassumunar ginger, turmeric, camphor) probably reduce pain (large trial of 500 women). Hollyhock leaf compress effects are completely uncertain. Two women had skin irritation. Feasibility/cost vary (requires heating/boiling facilities, UV/milling processing, professional prep).
- Breast Massage vs. Usual Care: Effectiveness: Don't know. Trials (e.g. Oketani method) reported results per breast, leading to exclusion from pooled analyses. High cost/reduced equity if specialized massage therapist is needed. Highly feasible/equitable if midwives/women are trained via leaflets."""
    },
    {
        "source": "WHO Postnatal Care Guidelines - Breast Engorgement Pharmacological & Summary",
        "category": "general",
        "content": """WHO Postnatal Care Guidelines - Breast Engorgement Pharmacological Interventions (Not Recommended):
- Note: GDG explicitly does not recommend subcutaneous oxytocin or proteolytic enzyme therapy. Breastfeeding counseling and support should be first-line.
- Subcutaneous Oxytocin vs. Placebo: Entirely uncertain whether daily injection of 2.5 IU of subcutaneous oxytocin softens breasts by day 3 (very low-certainty). Acceptability: Probably no (invasive/painful injection). Cost moderate (~US$ 0.19 to 1.19/ml + needles/sharps bins). Demands cold chain storage and skilled health workers.
- Proteolytic Enzymes vs. Placebo (oral protease complexes, bromelain, trypsin, serrapeptase): Highly uncertain if they affect pain/swelling (very low-certainty). One small trial suggested serrapeptase might reduce general engorgement (RR 0.36; low-certainty). Acceptability probably no (no long-term safety data for breastfeeding mothers). Moderate cost (~US$ 20-30 for 90 capsules). Omitted from WHO Essential Medicines list.

Non-Pharmacological vs. Pharmacological Comparison Summary:
- Cold Cabbage Leaves: Moderate desirable effect | Moderate certainty | Probably favors intervention | Negligible costs
- Cold Gel Packs: Small desirable effect | Low to Moderate certainty | Does not favor either | Moderate costs (~US$ 20)
- Warm Herbal Compresses: Small desirable effect | Low certainty | Don't know | Varies
- Breast Massage: Don't know | No included studies | Don't know | Varies (High if specialized)
- Subcutaneous Oxytocin: Don't know | Very Low certainty | Don't know | Moderate costs (requires cold chain)
- Proteolytic Enzymes: Don't know | Very Low certainty | Don't know | Moderate costs"""
    },
    {
        "source": "WHO Postpartum Haemorrhage (PPH) Prevention - Uterotonics (Oxytocin, Carbetocin, Misoprostol)",
        "category": "danger",
        "content": """WHO Postpartum Haemorrhage (PPH) Prevention - Approved Uterotonics:
1. Oxytocin (10 IU, IM/IV): Recommended for all births (vaginal/caesarean). If IV access is established, slow IV infusion/injection is preferred over IM. Avoid rapid IV bolus due to haemodynamic side-effects (hypotension/tachycardia). For C-sections, split 10 IU between a small IV bolus and slow infusion. Requires cold chain (2-8 °C).
2. Heat-Stable Carbetocin (100 µg, IM/IV): Context-specific. Recommended for all births only where unit cost is comparable to other uterotonics. Substantially reduces PPH with minimal side-effects. Does not require cold chain or refrigeration.
3. Misoprostol (400 µg or 600 µg, PO): Recommended for all births (hospital/community). Preferred route is oral (PO). Advance antenatal distribution during third-trimester visits is recommended for out-of-facility births without skilled personnel, with targeted monitoring. Increases shivering, fever, and diarrhoea, but benefits outweigh harms. Inexpensive; no cold chain needed."""
    },
    {
        "source": "WHO Postpartum Haemorrhage (PPH) Prevention - Uterotonics (Ergometrine & Oxytocin+Ergometrine)",
        "category": "danger",
        "content": """WHO Postpartum Haemorrhage (PPH) Prevention - Approved Uterotonics (Cont.):
4. Ergometrine / Methylergometrine (200 µg, IM/IV): Context-specific. Recommended only where hypertensive disorders (pre-eclampsia, eclampsia, gestational/chronic hypertension) and cardiovascular disorders can be safely and reliably excluded. High risk of drug-induced hypertension (50 per 1000 births). Requires refrigeration (2–8 °C).
5. Fixed-Dose Combination Oxytocin + Ergometrine (5 IU / 500 µg, IM): Context-specific. Only recommended if hypertensive disorders are excluded. Highly sensitive to heat; requires refrigeration (2–8 °C).

Uterotonic Comparative Summary:
- Oxytocin (IM/Slow IV) | Cold chain required | Key risk: Avoid rapid IV bolus | Setting: Facilities with skilled personnel.
- Carbetocin (IM/IV) | No cold chain (Heat-Stable) | Key risk: High unit cost | Setting: Facilities with skilled personnel.
- Misoprostol (PO) | No cold chain | Key risk: Causes shivering, fever, diarrhoea | Setting: Community/Remote births.
- Ergometrine (IM/IV) | Cold chain required | Key risk: Hypertensive/cardiovascular contraindications | Setting: Facilities with BP screening.
- Oxytocin + Ergometrine (IM) | Cold chain required | Key risk: Hypertensive/cardiovascular contraindications | Setting: Facilities with BP screening."""
    },
    {
        "source": "WHO PPH Prevention - Alternatives, Pre-Eclampsia & Hyperglycemia Classification",
        "category": "danger",
        "content": """WHO PPH Prevention - Alternatives, Pre-Eclampsia & Hyperglycemia:
- Injectable Prostaglandins (Carboprost, Sulprostone): Explicitly not recommended for PPH prevention. No benefit for severe PPH or transfusions. High gastrointestinal side-effects (diarrhoea risk NNH = 6). Expensive with low availability.
- Choice when multiple uterotonics are available: Oxytocin (10 IU IM/IV) is the first choice. Carbetocin reduces PPH >=500 mL but supply cost is 20x higher. Misoprostol alone is less effective than oxytocin for severe PPH. Ergometrine has severe hypertensive side-effects. Oxytocin + Misoprostol co-administration is highly effective but poorly feasible (dual route) and increases side-effects (shivering/fever).
- Cold-Chain Failure Rule: If cold chain fails, oxytocin and ergometrine are unsuitable. Prioritize heat-stable alternatives: heat-stable carbetocin or oral misoprostol.
- Pre-eclampsia Prevention (Calcium Supplementation):
  1. Pre-pregnancy: Research context only (powdery/unpalatable tablets).
  2. During pregnancy: Recommended in populations with low dietary calcium. Regimen: 1.5–2.0 g oral elemental calcium daily in three divided doses. Take calcium and iron supplements several hours apart (negative absorption interaction).
- Maternal Hyperglycemia Classification: Diagnose and classify hyperglycemia first detected in pregnancy as: 1. Diabetes mellitus in pregnancy, or 2. Gestational diabetes mellitus."""
    },
    {
        "source": "WHO Surgical Site Infection (SSI) Prevention - Preoperative Bathing & Decolonization",
        "category": "general",
        "content": """WHO SSI Prevention - Preoperative Bathing & Decolonization:
- Preoperative Bathing: Good clinical practice for patients to bathe or shower prior to surgery. Soap selection: Either plain soap or antimicrobial soap (chlorhexidine gluconate - CHG) is acceptable. CHG-impregnated cloths are not recommended due to high cost and very low-quality evidence. CHG can cause rare skin irritation, dermatitis, photosensitivity, or anaphylaxis.
- Mupirocin & CHG Decolonization:
  1. Target: Strong recommendation for S. aureus nasal carriers in cardiothoracic/orthopaedic surgeries; Conditional for other surgeries. Target population constraints: Adult only (no paediatric data).
  2. Protocol: Intranasal mupirocin 2% ointment (with/without CHG body wash). At least one dose must be immediately preoperative.
  3. Constraints: Screen first; universal decolonization is prohibited to prevent antimicrobial resistance (AMR). Do not use where baseline mupirocin resistance is high.
  4. Safety: Watch for localized allergic reactions. CHG must never contact brain, meninges, eyes, middle/inner ear, or mucosal surfaces. Strictly prohibited for neonates."""
    },
    {
        "source": "WHO SSI Prevention - SAP Timing, Hair Removal, Skin Prep, & Sealants",
        "category": "general",
        "content": """WHO SSI Prevention - SAP Timing, Hair Removal, Skin Prep, and Sealants:
- Surgical Antibiotic Prophylaxis (SAP) Timing: Administer SAP prior to incision, specifically within 120 minutes pre-incision. Valid for paediatric patients.
- Half-Life Customization: Tailor exact timing to half-life. Short half-life drugs (e.g., cefazolin) should be given <60 minutes before incision. Long half-life/prolonged infusion drugs (e.g., vancomycin, fluoroquinolones) must start early in the 120-minute window. Re-dose if surgery exceeds two half-lives or blood loss is excessive.
- Caesarean Section: SAP must be administered prior to surgical incision, NOT delayed until cord clamping.
- Preoperative Hair Removal: Strong recommendation against shaving. Leave hair intact or use an electric clipper if removal is mandatory for access/visualization. Shaving with razors causes micro-abrasions that increase SSI risk.
- Surgical Site Skin Preparation: Strong recommendation for alcohol-based CHG solutions on intact skin. Superior to aqueous solutions and alcohol-based povidone-iodine.
- Fire Safety: Alcohol is flammable. Allow prep to dry fully by evaporation before activating diathermy.
- Antimicrobial Sealants: Conditional recommendation against using cyanoacrylate-based sealants. No clinical benefit, and exposes patients to skin irritation/allergic reactions."""
    },
    {
        "source": "WHO SSI Prevention - Hand Prep, Nutritional Formulas, & Immunosuppressants",
        "category": "general",
        "content": """WHO SSI Prevention - Hand Prep, Nutritional Formulas, and Immunosuppressants:
- Surgical Hand Preparation: Perform scrub with antimicrobial soap + water OR rub with alcohol-based handrub (ABHR) before donning sterile gloves. Both methods show absolute clinical equivalence. Never combine sequentially (soap/water residue impairs ABHR activity). Initial plain soap wash required when entering OR suite. Local production of WHO-standard ABHR is encouraged in low-resource settings.
- ABHR/Scrub Warning: Frequent scrubbing causes irritation. 4% CHG is most likely to induce contact dermatitis. Prevent contact with eyes (conjunctivitis/corneal damage) or inner/middle ear (ototoxicity).
- Nutritional Formulas (Preoperative Support): Conditional recommendation. Consider oral/enteral multiple nutrient-enhanced formulas (arginine, glutamine, omega-3, nucleotides) ONLY for underweight adult major surgery patients (BMI <18.5, or weight 15-20% below norm). Paediatric inapplicability. Do not delay surgery or insert feeding tubes solely for this.
- Immunosuppressive Medications: Conditional recommendation against discontinuation. Suggests maintaining standard regimens of Methotrexate (MTX) and anti-TNF alpha biologics perioperatively. Customise discontinuation on a case-by-case basis."""
    },
    {
        "source": "WHO SSI Prevention - Summary Matrix of Preoperative Guidelines",
        "category": "general",
        "content": """WHO SSI Prevention - Summary Matrix of Preoperative Guidelines:
- Mupirocin 2% Ointment: Strong (Cardio/Ortho) / Conditional (Other) | Moderate certainty | Treat adult nasal carriers; immediate pre-op dose | Do not use in paediatric patients; avoid universal use to prevent AMR.
- SAP Timing: Strong | Low to Moderate certainty | Administer IV within 120 mins before incision | Tailor timing to drug half-life (e.g. cefazolin <60 mins); pre-incision for C-sections.
- Hair Removal: Strong Against Shaving | Moderate certainty | Leave hair intact or use electric clippers only | Shaving/razors entirely discouraged due to micro-abrasion risks.
- Skin Prep: Strong | Low to Moderate certainty | Alcohol-based antiseptic preferably with CHG on intact skin | Highly flammable; must dry completely. Toxic to eyes/ears/brain; avoid on neonates.
- Antimicrobial Sealants: Conditional Against | Very Low certainty | Do not use cyanoacrylate sealants | No clinical benefit; skin irritation risk.
- Surgical Hand Prep: Strong | Moderate certainty | Use ABHR or antimicrobial soap + water | Do not combine sequentially.
- Nutritional Formulas: Conditional | Very Low certainty | Oral/enteral formulas for underweight adult major surgery | BMI <18.5 only.
- Immunosuppressive Drugs: Conditional Against Discontinuation | Moderate certainty | Maintain MTX and anti-TNF medications perioperatively | Individualise regimens."""
    },
    {
        "source": "WHO SSI Prevention - Perioperative Blood Glucose Control & Goal-Directed Fluid Therapy",
        "category": "general",
        "content": """WHO SSI Prevention - Blood Glucose Control & GDFT:
- Perioperative Blood Glucose Control: Conditional recommendation (low-quality evidence). Use intensive blood glucose control protocols for both diabetic and non-diabetic adult surgical patients.
  1. Target Levels: Intensive protocols target blood glucose <=150 mg/dL (8.3 mmol/L). Conventional protocols target <220 mg/dL (12.2 mmol/L).
  2. Administration: IV insulin mandatory for intensive protocols. Methods include continuous/intermittent delivery and insulin clamp (fixed high-dose IV insulin + separate 20% dextrose to lock blood glucose at 70-110 mg/dL).
  3. Timing & Demographics: Must maintain control postoperatively (ranging from 18 hours to 14 days or until enteral nutrition). Adult only (unproven in children).
  4. Harms: High risk of life-threatening hypoglycaemia (<=40 mg/dL to <=80 mg/dL), leading to cardiac events. No difference in mortality or stroke.
- Intraoperative Goal-Directed Fluid Therapy (GDFT): Conditional recommendation (low-quality evidence). Titrate fluid volumes and inotropic drugs intraoperatively using a standardized algorithmic protocol driven by dynamic pre-load parameters (pulse/systolic pressure variation via arterial catheter or minimally invasive alternatives). Deployed to manage cardiovascular and renal function. Unproven in children."""
    },
    {
        "source": "WHO SSI Prevention - Surgical Drapes, Gowns, & Wound Protector Devices",
        "category": "general",
        "content": """WHO SSI Prevention - Surgical Drapes, Gowns, and Wound Protector (WP) Devices:
- Surgical Drapes and Gowns: Conditional recommendation (moderate to very low-quality). Sterile disposable non-woven or sterile reusable woven drapes/gowns are acceptable. Critical mandate: Materials must be completely impermeable to liquids to prevent patient cross-contamination and protect healthcare staff. Single-use drapes risk skin rashes/eczema from adhesive bands and accidental device dislodgement. Changing mid-operation has no evidence.
- Plastic Adhesive Incise Drapes (Recommended Against): Conditional recommendation against using plastic adhesive incise drapes (non-impregnated or antimicrobial). Studies show zero SSI reduction. Introduces risks of skin allergy (specifically to iodophor-impregnated films) and retained adhesive film fragments.
- Wound Protector (WP) Devices: Conditional recommendation (very low-quality). Consider single- or double-ring WPs in clean-contaminated (Class II), contaminated (Class III), and dirty (Class IV) abdominal surgeries.
  1. Caveats: Strictly single-use (do not reuse/reprocess). Forcing insertion in dense adhesions can cause small bowel injuries and prolong procedure.
  2. Removal Contamination: Improper handling during removal can dump collected fluids and contaminate wound edges (especially with peritonitis). Unproven in children."""
    },
    {
        "source": "WHO SSI Prevention - Incisional Wound Irrigation & Triclosan-Coated Sutures",
        "category": "general",
        "content": """WHO SSI Prevention - Incisional Wound Irrigation and Triclosan-Coated Sutures:
- Aqueous PVP-I Wound Irrigation: Conditional recommendation (low-quality). Consider irrigating the incisional wound with aqueous PVP-I solution before closure, mainly in Clean (Class I) and Clean-Contaminated (Class II) wounds. No dose-response found across PVP-I concentrations (spanned 0.35% to 10%).
  - Safety Warning: PVP-I is neurotoxic; never allow contact with exposed meninges, brain, or spinal cord. Can cause cytotoxic damage to fibroblasts/mesothelium, impairing healing. Substitute alternative if iodine allergy is present.
- Antibiotic Wound Irrigation (Recommended Against): Conditional recommendation against. Efficacy disproof shows zero benefit compared to saline or no irrigation. Drives antimicrobial resistance (AMR) and lacks standardized preparation procedures.
- Saline Solution Irrigation: Insufficient evidence for a definitive recommendation. Regular saline shows no benefit, but pulse pressure saline irrigation was beneficial in Classes I, II, and III compared to standard saline.
- Triclosan-Coated Sutures: Conditional recommendation (moderate-quality). Suggests using triclosan-coated absorbable sutures independent of surgery type or wound class (e.g., polydioxanone, polyglactin 910). Can be applied to paediatric patients (verify manufacturer rules). Minimal risk of systemic absorption."""
    },
    {
        "source": "WHO SSI Prevention - SAP Prolongation, Advanced Dressings, & Drains",
        "category": "general",
        "content": """WHO SSI Prevention - SAP Prolongation, Advanced Dressings, and Drains:
- Prolongation of Surgical Antibiotic Prophylaxis (SAP) (Strong Recommended Against): Do not extend SAP past completion of the operation. Standard single dose encompasses preoperative dose plus intraoperative re-dosing. Moderate-quality evidence from 44 RCTs confirms zero benefit.
  - Exceptions: Cardiac, orthognathic, and vascular surgeries had very low-quality trials suggesting benefit, but robust trials showed zero benefit to extending past 24 hours.
  - Harms: Strongly drives AMR, disrupts native microbiome, causes short/long-term GI complications, and directly accelerates Clostridium difficile infections.
- Advanced Wound Dressings (Recommended Against): Conditional recommendation against using advanced dressings (hydrocolloid, hydroactive, silver, PHMB) over standard sterile dry absorbent dressings on primarily closed wounds. No clinical advantage. Silver dressings risk nanoparticle exposure and skin irritation. High economic burden for LMICs.
- SAP in the Presence of Drains (Recommended Against): Conditional recommendation against continuing SAP solely due to the presence of a wound drain. Provides zero benefit. Drives AMR, side effects, C. difficile risk, and fungal superinfections.
- Wound Drain Removal: Conditional recommendation (very low-quality). Remove closed wound drainage systems only when clinically indicated. No optimal timeline exists. Single-use only. Early removal can cause seromas/haematomas requiring subsequent treatment."""
    },
    {
        "source": "WHO SSI Prevention - Summary Matrix of Perioperative Guidelines",
        "category": "general",
        "content": """WHO SSI Prevention - Summary Matrix of Perioperative Guidelines:
- Perioperative Blood Glucose: Conditional | Low certainty | Target <=150 mg/dL (8.3 mmol/L) using IV insulin; maintain post-op | High risk of life-threatening hypoglycaemia; unproven in children.
- Goal-Directed Fluid Therapy: Conditional | Low certainty | Titrate fluids/inotropes intraoperatively via algorithm | Avoid overload/hypovolemia; unproven in children.
- Drapes & Gowns: Conditional | Moderate to Very Low certainty | Use sterile disposable non-woven or reusable woven drapes/gowns | Must be impermeable to liquids.
- Plastic Adhesive Incise Drapes: Conditional Against | Low to Very Low certainty | Suggests NOT using them | Risk of skin allergy and retained film fragments.
- Wound Protector (WP) Devices: Conditional | Very Low certainty | Consider single/double-ring WPs in Class II-IV abdominal surgery | Single-use only; insertion difficult in dense adhesions.
- Aqueous PVP-I Irrigation: Conditional | Low certainty | Consider irrigating wound with aqueous PVP-I before closure (Class I/II) | Neurotoxic (no meninges/brain/spine contact); cytotoxic to fibroblasts.
- Antibiotic Irrigation: Conditional Against | Low certainty | Do not irrigate wound with antibiotic solutions | Zero benefit; drives AMR.
- Triclosan-Coated Sutures: Conditional | Moderate certainty | Suggests using triclosan-coated sutures | Valid for pediatric patients (check rules).
- Prolongation of SAP: Strong Against | Moderate certainty | Do not prolong SAP past completion of operation | Drives AMR, GI complications, C. difficile.
- Advanced Dressings: Conditional Against | Low certainty | Do not use advanced dressings over primarily closed wounds | No advantage; silver nanoparticles risk.
- SAP with Drains: Conditional Against | Low certainty | Do not continue SAP solely due to presence of drain | Drives AMR and fungal superinfections.
- Wound Drain Removal: Conditional | Very Low certainty | Remove closed drains only when clinically indicated | Early removal risk of seromas/haematomas."""
    },
    {
        "source": "WHO guidelines - Key Synthesis Points Across Preoperative & Perioperative Datasets",
        "category": "general",
        "content": """WHO Guidelines - Key Synthesis Points Across Preoperative & Perioperative Datasets:
1. Strict Anti-AMR Stance: WHO uses Strong/Strong Against mandates whenever an intervention threatens to drive AMR without high-certainty benefit. E.g., no prolonging SAP, strict ban on universal mupirocin decolonization, and no antibiotic wound/drain irrigation.
2. Chemical and Material Safety: CHG and PVP-I have strict anatomical boundaries. Neither can touch eyes, middle/inner ear, brain tissue, or meninges due to toxicities (CHG ototoxicity, PVP-I neurotoxicity). Alcohol-based preps require complete evaporation to eliminate fire hazards from electrosurgery.
3. Pediatric Data Gaps: Most advanced interventions (GDFT, advanced dressings, blood glucose protocols, wound protectors, pre-incisional PVP-I irrigation) are unproven for pediatric patients. Exceptions valid for children: SAP timing, preoperative hair clipping, and triclosan-coated sutures (check contraindications).
4. Material Reutilization: Wound protectors and closed wound drainage systems are strictly single-use; never reuse or reprocess.
5. Simplicity Over Commercialization: Standard practices are favored over expensive innovations. E.g., ABHR equal to antimicrobial soap, plain soap equal to CHG soap for bathing, standard dressings equal to advanced dressings, and no benefit for cyanoacrylate skin sealants/plastic incise drapes."""
    },
]

def embed_text(text: str) -> list:
    response = co.embed(
        texts=[text],
        model="embed-multilingual-v3.0",
        input_type="search_document",
        embedding_types=["float"]
    )
    return response.embeddings.float[0]

def seed_knowledge_base():
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    cur = conn.cursor()

    # Clear existing knowledge chunks to prevent duplication
    print("Clearing existing knowledge chunks...")
    cur.execute("TRUNCATE TABLE knowledge_chunks CASCADE;")
    conn.commit()

    print(f"Seeding {len(KNOWLEDGE_CHUNKS)} knowledge chunks...")

    batch_size = 20
    import time
    
    for i in range(0, len(KNOWLEDGE_CHUNKS), batch_size):
        batch = KNOWLEDGE_CHUNKS[i:i + batch_size]
        print(f"Embedding and seeding batch {i // batch_size + 1}/{(len(KNOWLEDGE_CHUNKS) - 1) // batch_size + 1} ({i+1} to {min(i + batch_size, len(KNOWLEDGE_CHUNKS))})...")
        
        texts = [chunk["content"] for chunk in batch]
        
        retries = 5
        embeddings = None
        while retries > 0:
            try:
                response = co.embed(
                    texts=texts,
                    model="embed-multilingual-v3.0",
                    input_type="search_document",
                    embedding_types=["float"]
                )
                embeddings = response.embeddings.float
                break
            except Exception as e:
                print(f"  Error calling Cohere API: {e}")
                retries -= 1
                if retries > 0:
                    print("  Waiting 15 seconds before retrying...")
                    time.sleep(15)
                else:
                    raise e
        
        for j, chunk in enumerate(batch):
            embedding = embeddings[j]
            cur.execute("""
                INSERT INTO knowledge_chunks (source, category, content, embedding)
                VALUES (%s, %s, %s, %s)
            """, (chunk["source"], chunk["category"], chunk["content"], embedding))
        
        conn.commit()
        # Sleep for 2 seconds between batches to avoid rate limit spikes
        if i + batch_size < len(KNOWLEDGE_CHUNKS):
            time.sleep(2)

    cur.close()
    conn.close()
    print("Done! Knowledge base seeded successfully.")

if __name__ == "__main__":
    seed_knowledge_base()
