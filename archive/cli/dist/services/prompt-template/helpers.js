import { Effect } from "effect";
import { TemplateService } from "./service.js";
export const renderPromptTemplate = (templatePath, parameters) => Effect.gen(function* () {
    const templateService = yield* TemplateService;
    const template = yield* templateService.loadTemplate(templatePath);
    const rendered = yield* templateService.renderTemplate(template, parameters);
    return rendered;
});
//# sourceMappingURL=helpers.js.map