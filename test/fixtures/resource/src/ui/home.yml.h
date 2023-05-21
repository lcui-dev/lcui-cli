/** This file is generated from home.yml */

#include <ui.h>

typedef struct {
        ui_widget_t *feedback;
        ui_widget_t *input_message;
        ui_widget_t *btn_save_message;
} home_refs_t;

const char *css_str_0 = "\
root {\
  background-color: #f6f8fa;\
}\
\
.feedback {\
  color: #28a745;\
  font-size: 12px;\
  margin-top: 5px;\
}\
\
";

static void home_create(ui_widget_t *home_parent, home_refs_t *refs)
{
        ui_widget_t *w[1];

        w[0] = ui_create_widget("text");
        refs->feedback = ui_create_widget("text");
        ui_widget_add_class(refs->feedback, "feedback");
        refs->input_message = ui_create_widget("textedit");
        ui_widget_set_attr(refs->input_message, "placeholder", "eg: hello, world!");
        refs->btn_save_message = ui_create_widget("button");
        ui_widget_append(home_parent, w[0]);
        ui_widget_append(home_parent, refs->feedback);
        ui_widget_append(home_parent, refs->input_message);
        ui_widget_append(home_parent, refs->btn_save_message);
        return home_parent;
}

static void home_install(void)
{
        ui_load_css_string(css_str_0, "home.css");
        pd_font_library_load_file("iconfont.ttf");
}
