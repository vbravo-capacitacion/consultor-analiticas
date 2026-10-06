#!/usr/bin/env python3
"""Valida data/*.json y lista los vacíos. Uso: python tools/validar-datos.py"""
import json,sys,os
b=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data')
ld=lambda n:json.load(open(os.path.join(b,n),encoding='utf-8'))
A,P,S=ld('analytics.json'),ld('parameters.json'),ld('situations.json')['items']
am={a['id']:a for a in A}; pm={p['id']:p for p in P}
err,gaps=[],[]
for a in A:
    for x in a['parameters']:
        if x not in pm: err.append(f"{a['id']}: parámetro inexistente {x}")
    if not a['hardwareNotes']: gaps.append(f"Analítica sin nota de cámara: {a['id']}")
    if not a['useCases']: gaps.append(f"Analítica sin casos de uso: {a['id']}")
for p in P:
    if not any(p['id'] in a['parameters'] for a in A): err.append(f"Parámetro sin analítica: {p['id']}")
    if p.get('belongsToFilter') and p['belongsToFilter'] not in pm: err.append(f"{p['id']}: padre inexistente")
    if not p['interpretationEs']: gaps.append(f"Parámetro sin interpretación: {p['id']}")
for s in S:
    for r in s['recommended']:
        a=am.get(r['analyticId'])
        if not a: err.append(f"{s['id']}: analítica inexistente {r['analyticId']}"); continue
        for q in r['params']:
            if 'id' in q and q['id'] not in a['parameters']: err.append(f"{s['id']}: {q['id']} no pertenece a {a['id']}")
            if q['valueSource'] not in ('default','propuesta','manual','pendiente'): err.append(f"{s['id']}: origen inválido en {q.get('id') or q.get('label')}")
    for k in s.get('keyParams',[]):
        if k not in pm: err.append(f"{s['id']}: parámetro clave inexistente {k}")
print(f"{len(A)} analíticas, {len(P)} parámetros, {len(S)} situaciones")
print("\nERRORES:" if err else "\nSin errores de referencias.",*err,sep="\n  ")
print(f"\nVACÍOS ({len(gaps)}):",*gaps,sep="\n  ")
sys.exit(1 if err else 0)
