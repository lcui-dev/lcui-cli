#include <LCUI.h>
#include <LCUI/gui/widget.h>
#include "{{fileName}}.h"

typedef struct {{className}}Rec_ {
	int your_widget_self;
} {{className}}Rec, *{{className}};

static LCUI_WidgetPrototype {{variableName}}_proto;

static void {{className}}_OnInit(LCUI_Widget w)
{
	{{className}} self;
	
	self = Widget_AddData(w, {{variableName}}_proto, sizeof({{className}}Rec));
	self->your_widget_self = 32;
	Widget_AddClass(w, "c-{{cssName}}");
}

static void {{className}}_OnDestroy(LCUI_Widget w)
{
	{{className}} self;
	
	self = Widget_GetData(w, {{variableName}}_proto);
	self->your_widget_self = 0;
}

void UI_Init{{className}}Component(void)
{
	{{variableName}}_proto = LCUIWidget_NewPrototype("{{tagName}}", NULL);
	{{variableName}}_proto->init = {{className}}_OnInit;
	{{variableName}}_proto->destroy = {{className}}_OnDestroy;
}
