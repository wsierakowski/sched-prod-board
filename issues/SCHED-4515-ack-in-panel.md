---
id: SCHED-4515
title: Ack moves from the row into an incident panel
status: done
plan: R2 (changed), hooks incident-panel, panel-ack; ack removed
---

Found in step 1 (recording 00:11): with new incidents landing live at the top (R1), a click aimed at one row's Ack
acked the row that slid under the pointer (meant INC-9058, got INC-3105).

Product's decision: "New incidents stay live at the top. Ack leaves the row: a row opens its incident panel, and Ack
lives there."

- Rows keep R1 (live, newest first) and lose their Ack button.
- Picking a row opens a fixed incident panel (`data-testid="incident-panel"`) that names the incident.
- The panel's Ack (`data-testid="panel-ack"`) acks the incident the panel names, and the row gets its `acked` mark.

Acceptance: a person aims at a row while a new incident lands; if the panel names another incident they pick the
row again; the ack always goes to the incident the panel names, and to the one they meant.
