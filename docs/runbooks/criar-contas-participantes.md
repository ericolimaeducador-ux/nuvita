# Runbook: creating the accounts of the beta participants (Erico executes; no personal data in this file)

> Based on what was done and seen in the production test of 2026-10-28. Beta: 8 real psychologists, **active CRP only** (no psychoanalysts, no other professions). One participant at a time; the steps below repeat for each one. Nothing about a person (name, e-mail, CRP, document) is ever written in a file of the repository.

## Rule for the first account
The first participant account is created by Erico **and used by Erico himself** (login, 2FA, terms, password change, one patient, one session) **before any access is sent to the participant**. Only if that works, the access goes out. The others follow the same steps without this pause.

## Steps, per participant
1. **Check the CRP** in the council's public consultation (the official registry). Write nothing in the repository. The CRP must exist, be active and belong to that person.
2. **Super-admin, "Nova clínica":** create the clinic for the participant with the **document left blank**. The label says the document is optional and the psychologist fills it on first use. The form also asks for the first admin of the clinic (name and e-mail): who that admin is (the participant or Erico's own user) is **a decision of Erico**, not settled by the test, which used separate fictitious admin users.
3. **Super-admin, "Novo usuário":** create the psychologist in that clinic with the **CRP exactly as checked in step 1** and the **e-mail of the person**. The CRP is typed freely (no format validation yet, post-beta debt): type it carefully.
4. **Read the "Acesso criado" screen without photographing or screenshotting it.** It shows the provisional password once. While it is open, nobody else (and no tool) looks at it. Copy what is needed to the password channel and close it.
5. **Send the access in two separate channels:** the e-mail carries the address and the instructions; the **provisional password goes by WhatsApp**, never in the same message as the e-mail address. **The e-mail and the WhatsApp message carry the address as a clickable link: `https://psi.nuvita.app.br`** (without www; `www` is not registered).
6. **Send the PDF of the guide** "Primeiros 15 minutos" (generated from `docs/guia/PRIMEIROS-15-MINUTOS.md`). The 2FA key (or QR code) is delivered once, as the guide describes in step 0; that delivery was not exercised in the 28/10 test, so do it in the first account (Erico) before the others.
7. **Check the clinics list** (Super Admin, tab Clínicas): the new clinic must show **"Documento pendente"** until the psychologist fills the CPF/CNPJ on first use (the screen "Informe o CPF ou CNPJ do consultório" appears when issuing a declaração or atestado). After the participant fills it, the column shows the document type and number.

## Stop conditions (do not create or send; ask first)
- **The CRP does not match** in the public consultation (not found, not active, other name): stop. Do not create the account.
- **The e-mail is refused** by the form, or the creation answers with an error: stop; do not retry with another address without asking.
- Anything on the "Acesso criado" screen looks different from the test (no password, an error, a duplicate): stop.
- The participant says the document number is refused with "Não foi possível salvar. Confirme o número ou fale com o suporte.": the number is invalid or already belongs to another clinic. Do not try values for them; correcting a saved document is only done by the super-admin.

## Never
- Do not paste e-mails, CRPs, documents, passwords or ids in a chat, a commit or a file.
- Do not reuse the test users (`ZZ-...`) for real participants.
- Do not create an account for a person whose CRP was not checked.
