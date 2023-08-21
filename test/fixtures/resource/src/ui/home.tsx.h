/** This file is generated from home.tsx */

#include <ui.h>

static ui_widget_prototype_t *home_proto;

/** This css code string is compiled from file home.module.css */
static const char *css_str_0 = "\
.home {\
  padding: 20px;\
}\
\
._button_1ayu2_9 {\
  padding: 5px 10px;\
  text-align: center;\
  border: 1px solid #eee;\
  border-radius: 4px;\
}\
\
._text_1ayu2_23 {\
  color: #f00;\
  font-size: 24px;\
}\
\
";


static void home_init_prototype(void)
{
        home_proto = ui_create_widget_prototype("home", NULL);
}

static void home_load_template(ui_widget_t *parent)
{
        ui_widget_t *w[4];

        ui_widget_add_class(parent, "home");
        w[0] = ui_create_widget("text");
        ui_widget_add_class(w[0], "_text_1ayu2_23");
        w[1] = ui_create_widget("text");
        ui_widget_set_text(w[1], "Hello, World!");
        ui_widget_append(w[0], w[1]);
        w[2] = ui_create_widget("button");
        ui_widget_add_class(w[2], "_button_1ayu2_9");
        w[3] = ui_create_widget("text");
        ui_widget_set_text(w[3], "Ok");
        ui_widget_append(w[2], w[3]);
        ui_widget_append(parent, w[0]);
        ui_widget_append(parent, w[2]);
}

static void home_load_resources(void)
{
        ui_load_css_string(css_str_0, "home.tsx");
}
