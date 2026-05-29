import React from 'react';
import { 
  ShieldAlert, Users, HeartPulse, HelpCircle, Phone, 
  FileText, Download, Printer 
} from 'lucide-react';

const SavedBirthPlans = ({ activePlan }) => {
  if (!activePlan) return null;

  // Safeguard array parsing against variable properties dropped straight from database states
  let emergencyContactsList = [];
  try {
    emergencyContactsList = typeof activePlan.emergency_contacts === 'string' 
      ? JSON.parse(activePlan.emergency_contacts) 
      : (activePlan.emergency_contacts || []);
  } catch(e) {
    emergencyContactsList = [];
  }

  // --- DOWNLOAD FUNCTION ---
  const handleDownloadText = (e) => {
    e.stopPropagation(); // Prevents any unexpected parent container layout collapse
    
    // Constructing a cleanly formatted plain text blueprint file
    const contactText = emergencyContactsList
      .map(c => `- ${c.name || 'Contact'}: ${c.phone || c}`)
      .join('\n');

    const fileContent = `==================================================
MATERNAL CARE CIRCLE - PERSONAL BIRTH PLAN
==================================================
Destination Hospital: ${activePlan.hospital_name}
Birth Companion:      ${activePlan.support_person}
Pain Preference:      ${activePlan.pain_preference}

--------------------------------------------------
SPECIAL MEDICAL NOTES
--------------------------------------------------
${activePlan.special_notes || 'None recorded.'}

--------------------------------------------------
EMERGENCY CONTACT DETAILS
--------------------------------------------------
${contactText || 'None linked.'}

--------------------------------------------------
GENERATED MEDICAL ASSISTANCE DOCUMENTATION
--------------------------------------------------
"${activePlan.generated_plan}"

==================================================
Generated on account history. Record ID: ${activePlan.id}
`;

    // Package the string structure down into an isolated downloadable local browser asset
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Birth_Plan_${activePlan.hospital_name.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up memory signatures safely
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- PRINT / SAVE AS PDF FUNCTION ---
  const handlePrintPlan = (e) => {
    e.stopPropagation();

    // Dynamically creating a print-only window structure isolates the plan document 
    // from your website's sidebar navigation menus, headers, and UI profile fields.
    const printWindow = window.open('', '_blank');
    
    const contactHtml = emergencyContactsList
      .map(c => `<li><strong>${c.name || 'Contact'}:</strong> ${c.phone || c}</li>`)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Birth Plan - ${activePlan.hospital_name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #5a4b6e; border-bottom: 2px solid #5a4b6e; padding-bottom: 10px; margin-bottom: 30px; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
            h2 { color: #7d6b91; font-size: 16px; text-transform: uppercase; margin-top: 30px; border-bottom: 1px dashed #ddd; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: repeat(3, 11fr); gap: 15px; margin-bottom: 20px; }
            .card { background: #fcfbfe; border: 1px solid #f3eff7; padding: 12px; rounded: 8px; }
            .label { font-size: 9px; font-weight: bold; color: #888; text-transform: uppercase; display: block; }
            .value { font-size: 13px; font-weight: bold; color: #111; }
            .plan-box { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; white-space: pre-line; font-style: italic; font-size: 13px; }
            ul { padding-left: 20px; font-size: 13px; }
            @media print {
              body { padding: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Personal Birth Specification Plan</h1>
          
          <div class="grid">
            <div class="card"><span class="label">Target Destination</span><span class="value">${activePlan.hospital_name}</span></div>
            <div class="card"><span class="label">Birth Companion</span><span class="value">${activePlan.support_person}</span></div>
            <div class="card"><span class="label">Pain Management</span><span class="value" style="text-transform: capitalize;">${activePlan.pain_preference}</span></div>
          </div>

          <h2>Special Notes / Medical Instructions</h2>
          <p style="font-size: 13px;">${activePlan.special_notes || 'None recorded.'}</p>

          <h2>Linked Crisis Plan Contacts</h2>
          ${contactHtml ? `<ul>${contactHtml}</ul>` : '<p style="font-size: 13px;">No secondary contacts linked.</p>'}

          <h2>Fully Generated Birth Plan Document</h2>
          <div class="plan-box">"${activePlan.generated_plan}"</div>

          <script>
            // Automatically prompts local printing/PDF dialogue when the virtual layout boots
            window.onload = function() { 
              window.print(); 
              setTimeout(function() { window.close(); }, 500); 
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-5 border-t border-primary-mauve/5 space-y-4 bg-gray-50/30 text-xs">
      
      {/* Structural Metric Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-start gap-2.5 shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-primary-mauve shrink-0 mt-0.5" />
          <div>
            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Target Destination</span>
            <span className="text-text-dark font-black mt-0.5 block">{activePlan.hospital_name}</span>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-start gap-2.5 shadow-2xs">
          <Users className="w-4 h-4 text-primary-mauve shrink-0 mt-0.5" />
          <div>
            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Birth Companion</span>
            <span className="text-text-dark font-black mt-0.5 block">{activePlan.support_person}</span>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-start gap-2.5 shadow-2xs">
          <HeartPulse className="w-4 h-4 text-primary-mauve shrink-0 mt-0.5" />
          <div>
            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Pain Management</span>
            <span className="text-text-dark font-black mt-0.5 block capitalize">{activePlan.pain_preference}</span>
          </div>
        </div>
      </div>

      {/* Special notes block */}
      {activePlan.special_notes && (
        <div className="p-3 bg-white border border-gray-100 rounded-xl flex items-start gap-2 shadow-2xs">
          <HelpCircle className="w-4 h-4 text-primary-mauve shrink-0 mt-0.5" />
          <div>
            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Special Notes / Medical Instructions</span>
            <p className="text-text-dark font-bold mt-0.5">{activePlan.special_notes}</p>
          </div>
        </div>
      )}

      {/* Main Complete Generative RAG AI Output Text Display */}
      <div className="bg-bg-rose-white/40 p-4 rounded-xl border border-primary-mauve/10 space-y-1">
        <span className="text-[9px] font-black text-primary-mauve uppercase tracking-wider flex items-center gap-1">
          <FileText className="w-3 h-3" /> Fully Generated Birth Plan Document
        </span>
        <p className="text-text-dark font-medium leading-relaxed italic whitespace-pre-line text-xs">
          "{activePlan.generated_plan}"
        </p>
      </div>

      {/* Secondary Contacts Loop Section */}
      {emergencyContactsList.length > 0 && (
        <div className="pt-2 border-t border-dashed border-gray-200 space-y-1.5">
          <span className="text-[9px] font-black text-text-muted uppercase tracking-wider flex items-center gap-1">
            <Phone className="w-3 h-3" /> Linked Crisis Plan Contacts
          </span>
          <div className="flex flex-wrap gap-2">
            {emergencyContactsList.map((contact, index) => (
              <span key={index} className="px-2.5 py-1 bg-white rounded-lg text-[10px] font-bold text-text-dark border border-gray-200 shadow-2xs">
                {contact.name || 'Contact'}: {contact.phone || contact}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Utilities Footer Bar */}
      <div className="flex justify-end items-center gap-2 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={handleDownloadText}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-text-dark font-bold text-[11px] rounded-lg transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Download (.txt)
        </button>
        <button
          type="button"
          onClick={handlePrintPlan}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-mauve text-white hover:bg-bg-dark-mauve font-bold text-[11px] rounded-lg transition-all cursor-pointer shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </button>
      </div>

    </div>
  );
};

export default SavedBirthPlans;