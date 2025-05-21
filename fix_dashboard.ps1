$content = Get-Content -Path "C:\Users\samip\OneDrive\Desktop\In-house\PRS\templates\salesperson_dashboard.html" -Raw
$content = $content -replace 'showAddProjectForm\(\);\\n\s+}\\n\s+}', 'showAddProjectForm();
        }
    }'
$content | Set-Content -Path "C:\Users\samip\OneDrive\Desktop\In-house\PRS\templates\salesperson_dashboard.html"
