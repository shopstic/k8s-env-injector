{{- define "env-injector.mutatingWebhookConfiguration" }}
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: {{ include "env-injector.fullname" . }}
webhooks:
  - name: {{ include "env-injector.fullname" . }}.{{ .Release.Namespace }}.svc.cluster.local
    clientConfig:
      caBundle: %%MUTATING_WEBHOOK_CONFIGURATION_CA_BUNDLE%%
      service:
        namespace: {{ .Release.Namespace }}
        name: {{ include "env-injector.fullname" . }}
        path: "/mutate"
        port: {{ .Values.service.port }}
    timeoutSeconds: 5
    sideEffects: None
    namespaceSelector:
      {{- required "Value .Values.mutationWebhook.namespaceSelector is required" .Values.mutationWebhook.namespaceSelector | toYaml | nindent 6 }}
    objectSelector:
      matchExpressions:
        - key: "shopstic.com/env-injector-controller"
          operator: NotIn
          values: ["true"]
        {{- with .Values.mutationWebhook.objectSelector.matchExpressions }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
      {{- with .Values.mutationWebhook.objectSelector.matchLabels }}
      matchLabels:
        {{- toYaml . | nindent 8 }}
      {{- end }}
    rules:
      - operations: ["CREATE"]
        apiGroups: ["*"]
        apiVersions: ["*"]
        resources: ["pods"]
        scope: "Namespaced"
    admissionReviewVersions: ["v1"]
{{- end }}