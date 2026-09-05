# Algowzxd Duik AE Exporter

This read-only ExtendScript extracts the selected After Effects composition and every nested composition into a portable JSON snapshot. It does not require Duik and does not modify or save the AEP.

1. Open `algowzxd full body duik.aep` in After Effects.
2. Select the final character composition in the Project panel or make it active.
3. Run **File → Scripts → Run Script File…** and choose `export-duik-rig.jsx`.
4. Save the result as `migration/algowzxd_2024_duik/raw/raw-duik-export.json`.
5. Open `/character/duik-import` in the Algowzxd editor and load that JSON.

The official Duik project was used only to confirm concepts and naming conventions; this exporter does not embed or call Duik code.
