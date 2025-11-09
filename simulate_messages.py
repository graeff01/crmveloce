#!/usr/bin/env python3
"""
Script para simular mensagens de leads no CRM
Útil para testar o sistema sem precisar do WhatsApp conectado
"""

import requests
import time
import random

API_URL = "http://localhost:5000/api/simulate/message"

# Lista de leads simulados
LEADS = [
    {
        "phone": "5551999999999",
        "name": "João Silva",
        "messages": [
            "Olá, tenho interesse em um imóvel",
            "Vocês tem apartamentos de 2 quartos?",
            "Qual o valor?",
        ]
    },
    {
        "phone": "5551988888888",
        "name": "Maria Santos",
        "messages": [
            "Bom dia! Vi o anúncio no ZAP",
            "Ainda está disponível?",
            "Posso agendar uma visita?",
        ]
    },
    {
        "phone": "5551977777777",
        "name": "Pedro Costa",
        "messages": [
            "Oi, quero saber mais sobre financiamento",
            "Qual a entrada mínima?",
        ]
    },
]

def simulate_message(phone, name, content):
    """Envia uma mensagem simulada para o CRM"""
    try:
        response = requests.post(API_URL, json={
            "phone": phone,
            "content": content,
            "name": name
        })
        
        if response.status_code == 200:
            print(f"✅ Mensagem enviada: {name} ({phone}): {content}")
            return True
        else:
            print(f"❌ Erro ao enviar mensagem: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

def simulate_conversation(lead, delay=2):
    """Simula uma conversa completa de um lead"""
    print(f"\n🤖 Simulando conversa de {lead['name']}...")
    
    for message in lead['messages']:
        simulate_message(lead['phone'], lead['name'], message)
        time.sleep(delay)
    
    print(f"✅ Conversa de {lead['name']} finalizada!\n")

def menu():
    """Menu interativo"""
    print("\n" + "="*50)
    print("🤖 SIMULADOR DE MENSAGENS - CRM WhatsApp")
    print("="*50)
    print("\n1. Simular uma mensagem única")
    print("2. Simular conversa completa de um lead")
    print("3. Simular todos os leads")
    print("4. Enviar mensagem personalizada")
    print("0. Sair")
    print("\n" + "="*50)

def main():
    """Função principal"""
    print("\n🚀 Bem-vindo ao Simulador de Mensagens!")
    print("⚠️  Certifique-se que o backend está rodando em http://localhost:5000\n")
    
    while True:
        menu()
        choice = input("\nEscolha uma opção: ").strip()
        
        if choice == "0":
            print("\n👋 Até logo!")
            break
            
        elif choice == "1":
            # Simular uma mensagem única
            print("\n📱 Leads disponíveis:")
            for i, lead in enumerate(LEADS, 1):
                print(f"{i}. {lead['name']} ({lead['phone']})")
            
            lead_choice = input("\nEscolha um lead (número): ").strip()
            try:
                lead_idx = int(lead_choice) - 1
                lead = LEADS[lead_idx]
                message = random.choice(lead['messages'])
                simulate_message(lead['phone'], lead['name'], message)
            except (ValueError, IndexError):
                print("❌ Opção inválida!")
        
        elif choice == "2":
            # Simular conversa completa
            print("\n📱 Leads disponíveis:")
            for i, lead in enumerate(LEADS, 1):
                print(f"{i}. {lead['name']} ({lead['phone']})")
            
            lead_choice = input("\nEscolha um lead (número): ").strip()
            try:
                lead_idx = int(lead_choice) - 1
                lead = LEADS[lead_idx]
                simulate_conversation(lead)
            except (ValueError, IndexError):
                print("❌ Opção inválida!")
        
        elif choice == "3":
            # Simular todos os leads
            print("\n🤖 Simulando todos os leads...\n")
            for lead in LEADS:
                simulate_conversation(lead, delay=1)
            print("✅ Todas as conversas foram simuladas!")
        
        elif choice == "4":
            # Mensagem personalizada
            print("\n✏️  Criar mensagem personalizada:")
            phone = input("Telefone (ex: 5551999999999): ").strip()
            name = input("Nome: ").strip()
            content = input("Mensagem: ").strip()
            
            if phone and name and content:
                simulate_message(phone, name, content)
            else:
                print("❌ Todos os campos são obrigatórios!")
        
        else:
            print("❌ Opção inválida!")
        
        input("\n⏸️  Pressione ENTER para continuar...")

if __name__ == "__main__":
    main()
