WIDGETS_DIR := $(HOME)/Library/Application Support/Übersicht/widgets
BUILD := build/stack.jsx

.PHONY: deploy build clean

default: clean deploy

build:
	@mkdir -p build
	@{ \
		sed '/\/\/ {{WIDGETS}}/,$$d' stack.jsx; \
		cat widgets/*.jsx; \
		sed '1,/\/\/ {{WIDGETS}}/d' stack.jsx; \
	} > $(BUILD)

deploy: build
	@cp $(BUILD) "$(WIDGETS_DIR)/stack.jsx"
	@cp -f *.png "$(WIDGETS_DIR)/" 2>/dev/null || true
	@osascript -e 'tell application id "tracesOf.Uebersicht" to refresh'
	@echo "deployed"

cd:
	@echo "$(WIDGETS_DIR)"

screenshot:
	$(eval LAST := $(shell ls -1 screenshot-*.png 2>/dev/null | sort -t- -k2 -n | tail -1 | sed 's/screenshot-0*\([0-9]*\)\.png/\1/'))
	$(eval NEXT := $(shell printf "%02d" $$(( $(if $(LAST),$(LAST),0) + 1 ))))
	@if [ -n "$(LAST)" ]; then git mv screenshot-$(shell printf "%02d" $(LAST)).png screenshot-$(NEXT).png; fi
	@cp "$$(ls -1t ~/Pictures/Screenshots/* | head -1)" screenshot-$(NEXT).png
	@sed -i.bak 's/screenshot-[0-9]*\.png/screenshot-$(NEXT).png/' README.md && rm -f README.md.bak
	@echo "screenshot-$(NEXT).png"

clean:
	@rm -rf build
