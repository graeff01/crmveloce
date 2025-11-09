from database import Database

db = Database()

# Criar leads de teste
leads_test = [
    ("Vitoria Souza", "555194061787"),
    ("Thalia Souza", "555194672957"),
    ("Gleisiane Pereira", "555184618884"),
    ("Mathias", "status@broadcast"),
]

for name, phone in leads_test:
    lead = db.create_or_get_lead(phone, name)
    print(f"✅ Lead criado: {name} - {phone}")

print("\n🎉 Dados de teste criados!")