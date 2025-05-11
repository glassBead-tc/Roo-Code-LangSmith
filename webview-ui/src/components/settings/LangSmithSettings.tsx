import React, { memo, HTMLAttributes } from "react"
import { VSCodeCheckbox, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { Activity } from "lucide-react"
import { Section } from "./Section"
import { SectionHeader } from "./SectionHeader"
import { SetCachedStateField } from "./types"

type LangSmithSettingsProps = HTMLAttributes<HTMLDivElement> & {
	langsmithApiKey?: string
	langsmithProjectName?: string
	langsmithTracingEnabled?: boolean
	setCachedStateField: SetCachedStateField<"langsmithApiKey" | "langsmithProjectName" | "langsmithTracingEnabled">
}

const LangSmithSettings = ({
	langsmithApiKey = "",
	langsmithProjectName = "",
	langsmithTracingEnabled = false,
	setCachedStateField,
	...props
}: LangSmithSettingsProps) => {
	const { t } = useAppTranslation()

	return (
		<div className="flex flex-col gap-6 p-6 overflow-auto" {...props}>
			<SectionHeader>
				<div className="flex items-center gap-2">
					<Activity className="w-4" />
					<div>{t("settings:langsmith.title")}</div>
				</div>
			</SectionHeader>

			<Section>
				<div className="text-vscode-descriptionForeground text-sm mb-4">
					{t("settings:langsmith.description")}
				</div>

				<div className="space-y-4">
					{/* API Key Input */}
					<div className="space-y-2">
						<label className="block font-medium mb-1">{t("settings:langsmith.apiKeyLabel")}</label>
						<div className="flex items-center">
							<VSCodeTextField
								type="password"
								value={langsmithApiKey}
								onInput={(e: any) => {
									setCachedStateField("langsmithApiKey", e.target.value)
								}}
								className="w-full"
								placeholder={t("settings:langsmith.apiKeyPlaceholder")}
								data-testid="langsmith-api-key"
							/>
						</div>
						<p className="text-xs text-vscode-descriptionForeground">
							{t("settings:langsmith.apiKeyDescription")}
						</p>
					</div>

					{/* Project Name Input */}
					<div className="space-y-2">
						<label className="block font-medium mb-1">{t("settings:langsmith.projectNameLabel")}</label>
						<div>
							<VSCodeTextField
								value={langsmithProjectName}
								onInput={(e: any) => {
									setCachedStateField("langsmithProjectName", e.target.value)
								}}
								className="w-full"
								placeholder={t("settings:langsmith.projectNamePlaceholder")}
								data-testid="langsmith-project-name"
							/>
						</div>
						<p className="text-xs text-vscode-descriptionForeground">
							{t("settings:langsmith.projectNameDescription")}
						</p>
					</div>

					{/* Tracing Toggle */}
					<div className="space-y-2">
						<VSCodeCheckbox
							checked={langsmithTracingEnabled}
							onChange={(e: any) => {
								setCachedStateField("langsmithTracingEnabled", e.target.checked)
							}}
							data-testid="langsmith-tracing-enabled">
							<span className="font-medium">{t("settings:langsmith.tracingEnabledLabel")}</span>
						</VSCodeCheckbox>
						<p className="text-xs text-vscode-descriptionForeground">
							{t("settings:langsmith.tracingEnabledDescription")}
						</p>
					</div>
				</div>
			</Section>
		</div>
	)
}

export default memo(LangSmithSettings)
