#include <LCUI.h>
#include <LCUI/gui/widget.h>
#include "{{fileName}}.h"

typedef struct {{className}}Rec_ {
	// Your view data
	// ...
} {{className}}Rec, *{{className}};

static LCUI_WidgetPrototype {{variableName}}_proto;

static {{className}}_OnReady(LCUI_Widget w, LCUI_WidgetEvent e, void *arg)
{
	{{className}} self;
	
	self = Widget_GetData(w, {{variableName}}_proto);
	// Do something after this view is ready
	// ...
	Widget_UnbindEvent(w, "ready", {{className}}_OnReady);
}

static void {{className}}_OnInit(LCUI_Widget w)
{
	{{className}} self;

	self = Widget_AddData(w, {{variableName}}_proto, sizeof({{className}}Rec));
	self->your_widget_data = 32;
	Widget_AddClass(w, "v-{{cssName}}");
	Widget_BindEvent(w, "ready", {{className}}_OnReady, NULL, NULL);
}

static void {{className}}_OnDestroy(LCUI_Widget w)
{
	{{className}} self;

	self = Widget_GetData(w, {{variableName}}_proto);
	Dict_Release(self->refs);
}

void UI_Init{{className}}(void)
{
	{{variableName}}_proto = LCUIWidget_NewPrototype("{{tagName}}", NULL);
	{{variableName}}_proto->init = {{className}}_OnInit;
	{{variableName}}_proto->destroy = {{className}}_OnDestroy;
}
