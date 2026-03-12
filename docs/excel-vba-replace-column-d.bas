Attribute VB_Name = "MenuReplaceColumnD"
' Macros para substituição na coluna D (Nome) da folha "Menu", célula a célula,
' para funcionar em folha protegida. Actuam automaticamente na coluna D (D2 até última linha).
' Executar via Alt+F8 ou Desenvolver > Macros.

Option Explicit

Private Const COL_D As Long = 4
Private Const SHEET_MENU As String = "Menu"

Private Function LastRowInColumnD() As Long
  Dim ws As Worksheet
  Set ws = ThisWorkbook.Sheets(SHEET_MENU)
  On Error Resume Next
  LastRowInColumnD = ws.Cells(ws.Rows.Count, COL_D).End(xlUp).Row
  On Error GoTo 0
  If LastRowInColumnD < 2 Then LastRowInColumnD = 1
End Function

' Modo 1: Substituir quando o texto da célula COMEÇA POR FindWhat
Public Sub ReplaceStartsWith()
  Dim FindWhat As String, ReplaceWith As String
  FindWhat = Trim(InputBox("TEXTO QUE A CELULA DEVE COMECAR POR (PROCURA NO INICIO):", "SUBSTITUIR (COMECA POR)"))
  If FindWhat = "" Then Exit Sub
  ReplaceWith = InputBox("SUBSTITUIR POR (VAZIO = APAGAR O TEXTO ENCONTRADO):", "SUBSTITUIR POR", "")
  ReplaceInColumnD "STARTS", FindWhat, ReplaceWith
End Sub

' Modo 2: Substituir quando o texto da célula ACABA EM FindWhat
Public Sub ReplaceEndsWith()
  Dim FindWhat As String, ReplaceWith As String
  FindWhat = Trim(InputBox("TEXTO QUE A CELULA DEVE ACABAR EM (PROCURA NO FIM):", "SUBSTITUIR (ACABA EM)"))
  If FindWhat = "" Then Exit Sub
  ReplaceWith = InputBox("SUBSTITUIR POR (VAZIO = APAGAR O TEXTO ENCONTRADO):", "SUBSTITUIR POR", "")
  ReplaceInColumnD "ENDS", FindWhat, ReplaceWith
End Sub

' Modo 3: Substituir todas as ocorrências de FindWhat na célula (contém)
Public Sub ReplaceContains()
  Dim FindWhat As String, ReplaceWith As String
  FindWhat = Trim(InputBox("TEXTO QUE A CELULA DEVE CONTER:", "SUBSTITUIR (CONTEM)"))
  If FindWhat = "" Then Exit Sub
  ReplaceWith = InputBox("SUBSTITUIR POR (VAZIO = APAGAR):", "SUBSTITUIR POR", "")
  ReplaceInColumnD "CONTAINS", FindWhat, ReplaceWith
End Sub

Private Sub ReplaceInColumnD(ByVal Mode As String, ByVal FindWhat As String, ByVal ReplaceWith As String)
  Dim ws As Worksheet
  Dim r As Long, lastRow As Long
  Dim cellVal As String, newVal As String
  Dim count As Long

  Set ws = ThisWorkbook.Sheets(SHEET_MENU)
  lastRow = LastRowInColumnD()
  If lastRow < 2 Then
    MsgBox "NAO HA DADOS NA COLUNA D (NOME).", vbInformation
    Exit Sub
  End If

  count = 0
  For r = 2 To lastRow
    cellVal = CStr(ws.Cells(r, COL_D).Value)
    If Len(cellVal) > 0 Then
      newVal = ""
      If Mode = "STARTS" Then
        If Left(cellVal, Len(FindWhat)) = FindWhat Then
          newVal = ReplaceWith & Mid(cellVal, Len(FindWhat) + 1)
          ws.Cells(r, COL_D).Value = newVal
          count = count + 1
        End If
      ElseIf Mode = "ENDS" Then
        If Right(cellVal, Len(FindWhat)) = FindWhat Then
          newVal = Left(cellVal, Len(cellVal) - Len(FindWhat)) & ReplaceWith
          ws.Cells(r, COL_D).Value = newVal
          count = count + 1
        End If
      ElseIf Mode = "CONTAINS" Then
        If InStr(1, cellVal, FindWhat, vbBinaryCompare) > 0 Then
          newVal = Replace(cellVal, FindWhat, ReplaceWith, 1, -1, vbBinaryCompare)
          ws.Cells(r, COL_D).Value = newVal
          count = count + 1
        End If
      End If
    End If
  Next r

  MsgBox "CONCLUIDO. CELULAS ALTERADAS: " & count, vbInformation
End Sub
