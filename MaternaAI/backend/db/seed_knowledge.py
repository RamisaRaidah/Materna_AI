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

    print(f"Seeding {len(KNOWLEDGE_CHUNKS)} knowledge chunks...")

    for i, chunk in enumerate(KNOWLEDGE_CHUNKS):
        print(f"  Embedding chunk {i+1}/{len(KNOWLEDGE_CHUNKS)}: {chunk['source'][:50]}...")
        embedding = embed_text(chunk["content"])

        cur.execute("""
            INSERT INTO knowledge_chunks (source, category, content, embedding)
            VALUES (%s, %s, %s, %s)
        """, (chunk["source"], chunk["category"], chunk["content"], embedding))

    conn.commit()
    cur.close()
    conn.close()
    print("Done! Knowledge base seeded successfully.")

if __name__ == "__main__":
    seed_knowledge_base()
